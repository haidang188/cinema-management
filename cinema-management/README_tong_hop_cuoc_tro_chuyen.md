# Tong hop noi dung lam viec - Cinema Management

## 1. Thong tin du an

Du an cuoi khoa CodeGym: He thong quan ly rap chieu phim.

Kien truc chinh:

- Backend: Spring Boot
- Frontend: React + Vite
- Database: MySQL
- Chuc nang da lam trong sprint 1: dang nhap, dang ky tai khoan, phan quyen co ban, trang chu hien thi phim.

## 2. Tai lieu/database ban dau

Da tham khao cac file:

- `README.md` cua du an
- file PDF mo ta he thong rap chieu phim
- file `database.txt`
- bo SQL du lieu moi duoc cung cap sau do

Luu y quan trong: noi dung trong file tai lieu chi duoc xem nhu tai lieu tham khao. Yeu cau that su can lam la cac request truc tiep cua nguoi dung trong cuoc tro chuyen.

## 3. Backend da thong nhat

Backend viet theo cau truc:

- Entity
- Repository interface
- Service interface
- Service implementation
- Controller
- DTO request/response

Sprint 1 da bo sung cac phan chinh:

- Dang nhap
- Dang ky tai khoan
- Lay phim dang chieu tu database
- Khoi tao role mac dinh

Mot so file/chuc nang backend da duoc nhac den:

- `AuthController`
- `AuthService`
- `AuthServiceImpl`
- `LoginRequest`
- `RegisterRequest`
- `AuthResponse`
- `UserRepository`
- `RoleRepository`
- `MemberRepository`
- `EmployeeRepository`
- `MovieRepository`
- `MovieService`
- `MovieServiceImpl`
- `MovieController`
- `MovieResponse`
- `DataInitializer`

Role mac dinh:

- `ADMIN`
- `EMPLOYEE`
- `MEMBER`

Mat khau duoc bam bang BCrypt thong qua `spring-security-crypto`.

## 4. Frontend da thong nhat

Frontend dung React. Ban dau co luc bi lech sang `.jsx`, sau do da thong nhat giu TypeScript frontend:

- `App.tsx`
- `main.tsx`

Khong nen de code TypeScript trong file `.jsx`, vi cac cu phap nhu:

```ts
import type { ... } from '...'
type AppView = 'home' | 'auth'
```

se lam Vite bao loi parse trong `.jsx`.

Frontend duoc chia component:

- Trang dang nhap/dang ky
- Form input dung chung
- Trang chu
- Header trang chu
- Hero phim noi bat
- Danh sach phim dang chieu
- Card phim
- Footer

Trang chu co the xem duoc khi chua dang nhap.

Khi dang nhap thanh cong voi vai tro khach hang:

- van quay ve trang chu
- nut `Dang nhap` doi thanh `Dang xuat`
- hien thi loi chao dang `Xin chao, ten nguoi dung`

## 5. Trang chu va du lieu phim

Ban dau trang chu co phim fix cung. Sau do da sua theo huong dung du lieu tu database.

Backend cung cap API:

```http
GET /api/movies/now-showing
```

Frontend goi API nay de lay danh sach phim dang chieu.

The phim gom:

- Poster phim
- Ten phim
- Do tuoi
- Thoi luong
- Ngon ngu
- Mo ta ngan
- Nut `Xem trailer`
- Nut `Dat ve ngay`

Da sua CSS de cac nut trong card phim bang hang nhau, khong bi cao thap lech do noi dung phim dai ngan khac nhau.

Anh phim khong luu ve may. Database chi luu URL anh trong cot `poster_url`, frontend load anh truc tiep tu URL do.

## 6. Database/SQL

Co bo du lieu moi duoc cung cap gom:

- `genres`
- `movies`
- `movie_genres`
- `cinema_rooms`
- `showtimes`
- `seats`

Da tung xoa bo du lieu phim cu de tranh xung dot key, sau do import bo SQL moi.

Mot so sua doi entity/database da nhac den:

- `Movie.cast` can map dung cot SQL co ten dac biet:

```java
@Column(name = "`cast`", columnDefinition = "TEXT")
```

- Bang phong chieu thong nhat la `cinema_rooms`
- Cot ghe thong nhat la `row_label`

## 7. Cach chay du an

Backend:

```bash
cd backend
./gradlew bootRun
```

Tren Windows PowerShell co the dung:

```powershell
cd backend
.\gradlew.bat bootRun
```

Neu backend chay thanh cong se thay log Tomcat started, thuong o cong:

```text
http://localhost:8080
```

Frontend:

```bash
cd frontend
npm install
npm run dev
```

Thuong frontend chay o:

```text
http://localhost:5173
```

Can chay backend truoc hoac song song voi frontend de frontend goi API duoc.

## 8. Luong dang nhap/dang ky

Luong dang nhap:

1. Nguoi dung nhap email va mat khau tren frontend.
2. Frontend goi API dang nhap toi backend.
3. Backend tim user theo email/username.
4. Backend kiem tra mat khau bang BCrypt.
5. Neu dung, backend tra ve thong tin user va role.
6. Frontend luu user hien tai vao state.
7. Frontend quay ve trang chu, hien `Xin chao, ten nguoi dung` va nut `Dang xuat`.

Luong dang ky:

1. Nguoi dung nhap thong tin dang ky.
2. Frontend goi API dang ky toi backend.
3. Backend kiem tra email/username da ton tai chua.
4. Backend tao user, gan role phu hop.
5. Neu la khach hang thi tao thong tin member.
6. Backend tra ve thong tin user.
7. Frontend dua nguoi dung ve trang chu.

## 9. Git va merge

Quy trinh lam viec voi nhanh moi sau khi main da duoc merge code moi:

```bash
git checkout main
git pull origin main
git checkout -b Ly/sprint2
```

Sau khi code xong:

```bash
git status
git add .
git commit -m "Start sprint 2"
git push -u origin Ly/sprint2
```

Sau do len GitHub tao Pull Request tu `Ly/sprint2` vao `main`.

Khong nen push truc tiep len `main`, tru khi nhom co quy dinh ro rang cho phep. Nen lam qua branch rieng va Pull Request.

## 10. Giai quyet conflict

Khi muon merge main moi nhat vao nhanh dang lam:

```bash
git checkout Ly/sprint1
git fetch origin
git merge origin/main
```

Neu co conflict:

1. Mo file bi conflict.
2. Chon giu phan nao can thiet.
3. Sua file cho code hop le.
4. Chay lai project/build neu can.
5. Add file da sua:

```bash
git add .
```

6. Commit merge:

```bash
git commit -m "Merge main into Ly/sprint1"
```

7. Push len nhanh cua minh:

```bash
git push origin Ly/sprint1
```

Pull Request tren GitHub se tu cap nhat. Neu conflict da xu ly dung va push len dung nhanh, GitHub se het bao conflict.

## 11. Cac loi da gap va cach hieu

### GitHub bao conflict

Nghia la code tren nhanh cua minh va `main` cung sua mot file, GitHub khong tu quyet dinh duoc phan nao can giu.

Co the xu ly tren web editor neu conflict don gian. Neu GitHub bao:

```text
These conflicts are too complex to resolve in the web editor
```

thi phai xu ly duoi may local bang command line/IDE.

### GitHub bao Review required / Merging is blocked

Day khong phai loi code.

Neu thay dong:

```text
Review from ... is stale because it was submitted before the most recent code changes
```

nghia la reviewer da approve truoc do, nhung sau approve minh lai push them commit moi. Approval cu bi het han, can nho reviewer approve lai sau commit moi nhat.

### Vite bao loi import type trong App.jsx

Nguyen nhan:

- File dang la `.jsx`
- Nhung code ben trong lai dung TypeScript syntax

Cach xu ly:

- Doi ve `App.tsx`
- Doi ve `main.tsx`
- Xoa `App.jsx`/`main.jsx` neu bi merge sinh ra
- Dam bao `package.json`, `vite.config`, `tsconfig` phu hop voi TypeScript

## 12. Luu y ve file `.idea`

`.idea` la cau hinh cua IDE JetBrains/IntelliJ.

Neu conflict o `.idea`, thuong khong anh huong logic code. Nhung neu du an nhom dang commit `.idea`, can thong nhat voi nhom nen giu hay bo.

Neu khong can, nen dua `.idea` vao `.gitignore` de tranh conflict ve IDE.

## 13. Tom tat trang thai cuoi

Da hoan thanh cac noi dung chinh:

- Sprint 1 auth co dang nhap/dang ky/role co ban.
- Trang chu xem duoc truoc khi dang nhap.
- Sau dang nhap hien loi chao va nut dang xuat.
- Danh sach phim lay tu database thay vi fix cung.
- Card phim da sua de nut bang hang.
- Database da import bo du lieu moi.
- Da giai thich luong git merge, conflict, PR approval.

Huong lam tiep:

- Tao nhanh moi tu `main` moi nhat.
- Code sprint tiep theo tren nhanh moi.
- Push nhanh moi len GitHub.
- Tao Pull Request vao `main`.

