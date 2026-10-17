import assert from 'node:assert/strict'
import { after, afterEach, before, test } from 'node:test'
import { JSDOM } from 'jsdom'
import { createServer } from 'vite'
import React, { act } from 'react'
import axios from 'axios'

// DOM interaction tests, not browser/layout tests. All writes use mocked fetch.
const dom = new JSDOM('<!doctype html><html><body><button id="trigger">Open</button><div id="root"></div></body></html>', { url: 'http://localhost:5173' })
for (const name of ['window', 'document', 'HTMLElement', 'Node', 'Event', 'MouseEvent', 'KeyboardEvent', 'FocusEvent']) globalThis[name] = dom.window[name]
globalThis.IS_REACT_ACT_ENVIRONMENT = true
const { createRoot } = await import('react-dom/client')
dom.window.HTMLElement.prototype.scrollIntoView = function () {}
let server, root, AppModal, MovieForm, RoomForm, MovieList, RoomList, EmployeeList, MemberList, ShowtimeManagement, request
let routes, AdminShell, router
const { createMemoryRouter, RouterProvider } = await import('react-router-dom')
let calls = []
let respond
const member = { id: 1, username: 'thanhvien', fullName: 'Nguyễn Thị Ánh', email: 'anh@example.test', status: 'ACTIVE', pointBalance: 1250, membershipLevel: 'GOLD' }
const employee = { id: 2, employeeCode: 'NV002', username: 'nhanvien', fullName: 'Trần Hưng', email: 'hung@example.test', status: 'ACTIVE' }
const movie = { id: 3, title: 'Phim tiếng Việt', durationMinutes: 120, posterUrl: '', status: 'SHOWING', genres: [] }
const room = { id: 4, name: 'Phòng chiếu Ánh sáng', roomType: '2D', status: 'ACTIVE', totalSeats: 1, seats: [{ id: 1, rowLabel: 'A', seatNumber: 1, seatType: 'NORMAL', status: 'ACTIVE', gridRow: 0, gridColumn: 0 }] }
const page = (content) => ({ content, totalPages: content.length ? 1 : 0, totalElements: content.length, number: 0, size: 10 })
function json(data, status = 200) { return new Response(JSON.stringify(data), { status, headers: { 'Content-Type': 'application/json' } }) }
function normalResponse(url) {
  const path = new URL(url).pathname
  if (path === '/api/movies/admin/3') return json(movie)
  if (path === '/api/admin/cinema-rooms/4') return json(room)
  if (path === '/api/admin/cinema-rooms') return json(page([room]))
  if (path === '/api/admin/showtimes') return json([])
  if (path.endsWith('/statistics')) return json({ totalMembers: 1, activeMembers: 1, inactiveMembers: 0, totalPoints: 1250 })
  if (path.endsWith('/genres')) return json([{ id: 1, name: 'Hành động' }])
  if (path.endsWith('/members/1')) return json(member)
  if (path.endsWith('/employees/2')) return json(employee)
  if (path.endsWith('/members')) return json(page([member]))
  if (path.endsWith('/employees')) return json(page([employee]))
  return json(page([]))
}
before(async () => {
  server = await createServer({ server: { middlewareMode: true, watch: null }, appType: 'custom' })
  const load = async (path) => (await server.ssrLoadModule('/src/' + path)).default
  AppModal = await load('component/common/AppModal.tsx')
  MovieForm = await load('component/movie/MovieForm.tsx')
  RoomForm = await load('pages/admin/rooms/CinemaRoomForm.tsx')
  MovieList = await load('pages/admin/movies/MovieList.tsx')
  RoomList = await load('pages/admin/rooms/CinemaRoomList.tsx')
  EmployeeList = await load('pages/admin/employees/EmployeeList.tsx')
  MemberList = await load('pages/admin/members/MemberList.tsx')
  ShowtimeManagement = await load('pages/admin/showtimes/ShowtimeManagement.tsx')
  request = (await server.ssrLoadModule('/src/service/httpClient.ts')).request
  routes = [
    ...(await server.ssrLoadModule('/src/routes/adminRoutes.tsx')).adminRoutes,
    ...(await server.ssrLoadModule('/src/routes/PromotionRoutes.tsx')).promotionRoutes,
    ...(await server.ssrLoadModule('/src/routes/showtimeRoutes.tsx')).showtimeRoutes,
    ...(await server.ssrLoadModule('/src/routes/ticketPriceRoutes.tsx')).ticketPriceRoutes,
  ]
  AdminShell = (await server.ssrLoadModule('/src/routes/RouteShells.tsx')).AdminShell
  axios.defaults.adapter = async (config) => ({ data: [], status: 200, statusText: 'OK', headers: {}, config })
})
afterEach(async () => {
  if (root) await act(async () => root.unmount())
  root = null
  router?.dispose(); router = undefined
  calls = []
  respond = undefined
})
after(async () => { await server?.close(); dom.window.close() })
function mockFetch() {
  globalThis.fetch = async (url, options = {}) => {
    calls.push({ url: String(url), ...options })
    return respond ? respond(String(url), options) : normalResponse(String(url))
  }
}
async function render(Component, props = {}) {
  mockFetch()
  root = createRoot(document.getElementById('root'))
  await act(async () => root.render(React.createElement(Component, props)))
}
async function click(element) {
  assert.ok(element, 'target must exist')
  await act(async () => element.dispatchEvent(new MouseEvent('click', { bubbles: true, detail: 0 })))
}
function button(text, scope = document) { return [...scope.querySelectorAll('button')].find((item) => item.textContent.trim() === text) }
async function input(element, value) {
  await act(async () => {
    Object.getOwnPropertyDescriptor(dom.window.HTMLInputElement.prototype, 'value').set.call(element, value)
    element.dispatchEvent(new Event('input', { bubbles: true }))
    element.dispatchEvent(new Event('change', { bubbles: true }))
  })
}
async function submit(form) { await act(async () => form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))) }
function deferred() { let resolve; const promise = new Promise((r) => { resolve = r }); return { promise, resolve } }

test('modal: focus entry, Tab loop, outside focus containment, restore, scroll lock', async () => {
  const trigger = document.getElementById('trigger'); trigger.focus()
  await render(AppModal, { title: 'Chi tiết', onClose() {}, actions: [{ label: 'Đóng', onClick() {} }] })
  const dialog = document.querySelector('[role="dialog"]')
  const buttons = [...dialog.querySelectorAll('button')]
  assert.equal(document.activeElement, buttons[0])
  assert.equal(document.body.style.overflow, 'hidden')
  buttons.at(-1).focus()
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', bubbles: true, cancelable: true })))
  assert.equal(document.activeElement, buttons[0])
  await act(async () => document.dispatchEvent(new KeyboardEvent('keydown', { key: 'Tab', shiftKey: true, bubbles: true, cancelable: true })))
  assert.equal(document.activeElement, buttons.at(-1))
  trigger.focus(); assert.ok(dialog.contains(document.activeElement))
  assert.equal(dialog.getAttribute('aria-labelledby'), dialog.querySelector('h2').id)
  await act(async () => root.unmount()); root = null
  assert.equal(document.activeElement, trigger)
  assert.equal(document.body.style.overflow, '')
})

test('modal: busy blocks Escape/overlay/close; nested discard only closes top dialog', async () => {
  let closed = 0
  const props = { title: 'Chỉnh sửa', onClose: () => closed++, closeOnOverlay: true, confirmClose: true }
  await render(AppModal, { ...props, busy: true })
  await click(document.querySelector('.modal__close'))
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
  await act(async () => document.querySelector('.modal-overlay').dispatchEvent(new MouseEvent('mousedown', { bubbles: true })))
  assert.equal(closed, 0)
  await act(async () => root.render(React.createElement(AppModal, props)))
  await click(document.querySelector('.modal__close'))
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 2)
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 1)
  assert.equal(closed, 0)
  assert.equal(document.body.style.overflow, 'hidden')
})

test('SP1: empty validation focuses title and does not save; failed poster has fallback', async () => {
  let saved = 0
  await render(MovieForm, { submitLabel: 'Lưu', onSubmit: async () => saved++, onCancel() {} })
  await submit(document.querySelector('form'))
  assert.equal(saved, 0)
  assert.equal(document.activeElement.dataset.field, 'title')
  assert.equal(document.activeElement.getAttribute('aria-invalid'), 'true')
  assert.ok(document.querySelector('#movie-title-error'))
  await input(document.querySelector('[data-field="posterUrl"]'), 'https://res.cloudinary.com/test/missing.jpg')
  await act(async () => document.querySelector('.poster-preview img').dispatchEvent(new Event('error')))
  assert.match(document.querySelector('.poster-preview').textContent, /Không tải được/)
})

test('SP1: repeated submit sends once, pending disables cancel, API failure stays in form', async () => {
  const save = deferred(); let count = 0
  await render(MovieForm, { initialMovie: movie, submitLabel: 'Lưu', onSubmit: () => { count++; return save.promise }, onCancel() {} })
  const form = document.querySelector('form')
  await act(async () => {
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
    form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }))
  })
  assert.equal(count, 1)
  assert.equal(button('Quay lại').disabled, true)
  await act(async () => save.resolve(Promise.reject(new Error('Không thể lưu phim'))))
  assert.match(document.querySelector('[role="alert"]').textContent, /Không thể lưu phim/)
})

test('SP2: keyboard paints NORMAL/VIP/INACTIVE/EMPTY; clear needs confirmation', async () => {
  await render(RoomForm, { mode: 'create', saving: false, onCancel() {}, onSubmit: async () => {} })
  const cell = () => document.querySelector('.designer-seat-cell')
  await click(cell()); assert.match(cell().getAttribute('aria-label'), /ghế thường/)
  await click(button('Ghế VIP')); await click(cell()); assert.ok(cell().classList.contains('is-vip'))
  await click(button('Ghế ngừng hoạt động')); await click(cell()); assert.match(cell().getAttribute('aria-label'), /ngừng hoạt động/)
  await click(button('Khoảng trống')); await click(cell()); assert.ok(cell().classList.contains('is-empty'))
  await click(button('Tạo tất cả ghế'))
  await click(button('Xóa toàn bộ'))
  assert.match(document.querySelector('[role="dialog"]').textContent, /Xóa toàn bộ ghế/)
  assert.equal(document.querySelectorAll('.is-seat').length, 72)
})

test('SP2: max 20x30 seats preserve coordinates and repeated save sends once', async () => {
  const save = deferred(); const payloads = []
  await render(RoomForm, { mode: 'create', saving: false, onCancel() {}, onSubmit: (payload) => { payloads.push(payload); return save.promise } })
  await input(document.querySelector('.room-form-field input'), 'Phòng chiếu tiếng Việt')
  const dimensions = [...document.querySelectorAll('input[type="number"]')]
  await input(dimensions[0], '20'); await input(dimensions[1], '30')
  assert.equal(document.querySelectorAll('.designer-seat-cell').length, 600)
  await click(button('Tạo tất cả ghế'))
  const form = document.querySelector('form')
  await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
  assert.equal(payloads.length, 1)
  assert.equal(payloads[0].seats.length, 600)
  assert.equal(payloads[0].seats.at(-1).gridColumn, 29)
  assert.equal(payloads[0].seats.at(-1).gridRow, 19)
  await act(async () => save.resolve())
})

test('SP2: empty tool omits the removed seat, preserves gaps, and displays a rejected save without resetting draft', async () => {
  const payloads = []
  const initialRoom = { ...room, totalSeats: 3, seats: [0, 1, 2].map((column) => ({ ...room.seats[0], id: column + 1, seatNumber: column + 1, gridColumn: column })) }
  await render(RoomForm, { mode: 'edit', initialRoom, saving: false, onCancel() {}, onSubmit: async (payload) => {
    payloads.push(payload)
    throw new Error('Không thể chuyển ghế A2 thành khoảng trống vì ghế đang gắn với suất chiếu.')
  } })
  await click(button('Khoảng trống'))
  await click(document.querySelectorAll('.designer-seat-cell')[1])
  await submit(document.querySelector('form'))
  assert.equal(payloads.length, 1)
  assert.deepEqual(payloads[0].seats.map((seat) => [seat.seatNumber, seat.gridColumn]), [[1, 0], [2, 2]])
  assert.match(document.querySelector('[role="alert"]').textContent, /ghế A2.*suất chiếu/)
  assert.ok(document.querySelectorAll('.designer-seat-cell')[1].classList.contains('is-empty'))
  assert.match(document.querySelector('.room-designer-note').textContent, /sẽ xóa ghế khi lưu/)
})

test('SP3: create modal validation and dirty cancel preserve typed data', async () => {
  await render(EmployeeList, { onNavigate() {} })
  await click(button('Thêm nhân viên'))
  await submit(document.querySelector('form'))
  assert.ok(document.querySelectorAll('.employee-field-error').length > 0)
  assert.equal(calls.filter((c) => c.method === 'POST').length, 0)
  await input(document.querySelector('form input'), 'nhanvien_moi')
  await click(document.querySelector('.modal__close'))
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 2)
  await click(button('Tiếp tục chỉnh sửa'))
  assert.equal(document.querySelector('form input').value, 'nhanvien_moi')
})

test('SP3: closing pending detail prevents late request reopening modal', async () => {
  const pending = deferred()
  await render(EmployeeList, { onNavigate() {} })
  respond = (url) => url.endsWith('/employees/2') ? pending.promise : normalResponse(url)
  const view = document.querySelector('button[aria-label^="Xem"]')
  await click(view)
  await click(document.querySelector('.modal__close'))
  await act(async () => pending.resolve(json(employee)))
  assert.equal(document.querySelector('[role="dialog"]'), null)
})

test('SP4: edit validation, duplicate response visible inside modal, double-submit blocked', async () => {
  await render(MemberList)
  await click(document.querySelector('button[aria-label^="Sửa"]'))
  const name = [...document.querySelectorAll('.member-field')].find((label) => label.textContent.includes('Họ và tên')).querySelector('input')
  await input(name, '')
  await submit(document.querySelector('form'))
  assert.ok(document.querySelector('.member-field-error'))
  await input(name, 'Nguyễn Thị Ánh mới')
  const pending = deferred()
  respond = (url, options) => options.method === 'PUT' ? pending.promise : normalResponse(url)
  const form = document.querySelector('form')
  await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
  assert.equal(calls.filter((c) => c.method === 'PUT').length, 1)
  assert.equal(document.querySelector('.modal__close').disabled, true)
  await act(async () => pending.resolve(json({ message: 'Email đã tồn tại', fieldErrors: { email: 'Email đã tồn tại' } }, 409)))
  assert.match(document.querySelector('[role="dialog"] [role="alert"]').textContent, /Email đã tồn tại/)
  assert.equal(document.querySelector('.member-alert-success'), null)
})

test('SP4: canceled loading detail ignores late response; successful update refreshes list', async () => {
  await render(MemberList)
  const pending = deferred()
  respond = (url) => url.endsWith('/members/1') ? pending.promise : normalResponse(url)
  await click(document.querySelector('button[aria-label^="Xem"]'))
  await click(document.querySelector('.modal__close'))
  await act(async () => pending.resolve(json(member)))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  respond = normalResponse
  await click(document.querySelector('button[aria-label^="Sửa"]'))
  await submit(document.querySelector('form'))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.match(document.querySelector('[role="status"]').textContent, /Đã cập nhật/)
  assert.ok(calls.filter((c) => c.url.includes('/members?')).length >= 2)
})

for (const status of [400, 401, 403, 404, 409, 500]) {
  test(`HTTP ${status}: readable safe error preserves status`, async () => {
    mockFetch(); respond = () => json({ message: 'java.lang.IllegalStateException: internal SQL detail', fieldErrors: { email: 'java.sql.SQLException: stacktrace' } }, status)
    await assert.rejects(request('/api/test'), (error) => error.status === status && !/java\.|SQL|Exception/.test(error.message) && !JSON.stringify(error.fieldErrors || {}).includes('java.'))
  })
}
test('HTTP: HTML 500, invalid success JSON, network loss and empty 204', async () => {
  mockFetch(); respond = () => new Response('<html>Internal error</html>', { status: 500 })
  await assert.rejects(request('/api/test'), /Máy chủ/)
  respond = () => new Response('invalid', { status: 200 })
  await assert.rejects(request('/api/test'), /Phản hồi/)
  respond = () => { throw new TypeError('Failed to fetch') }
  await assert.rejects(request('/api/test'), /Không thể kết nối/)
  respond = () => new Response(null, { status: 204 })
  assert.equal(await request('/api/test'), null)
})

for (const path of ['/admin', '/admin/movies', '/admin/movies/create', '/admin/movies/3/edit', '/admin/cinema-rooms', '/admin/cinema-rooms/create', '/admin/cinema-rooms/4/edit', '/admin/cinema-rooms/4', '/admin/employees', '/admin/members', '/admin/showtimes', '/admin/promotions', '/admin/promotions/create', '/admin/promotions/1', '/showtimes', '/ticket-prices']) {
  test(`Admin regression: ${path} mounts in shell without runtime errors (mock API)`, async () => {
    mockFetch()
    const browserErrors = []
    const onError = (event) => browserErrors.push(event.error)
    window.addEventListener('error', onError)
    respond = (url) => {
      const pathname = new URL(url).pathname
      if (pathname.endsWith('/promotions/statistics')) return json({ total: 0, active: 0, upcoming: 0, expiringSoon: 0 })
      if (/\/promotions\/1$/.test(pathname)) return json({ id: 1, title: 'Khuyến mãi', code: 'QA', discountType: 'FIXED', discountValue: 10000, startDate: '2026-01-01', endDate: '2026-12-31', status: 'ACTIVE', usedCount: 0 })
      return normalResponse(url)
    }
    router = createMemoryRouter(routes.map((route) => ({ ...route, element: React.createElement(AdminShell, { currentUser: { role: 'ADMIN' }, onLogout() {}, onLoginClick() {} }, route.element) })), { initialEntries: [path] })
    root = createRoot(document.getElementById('root'))
    await act(async () => root.render(React.createElement(RouterProvider, { router })))
    window.removeEventListener('error', onError)
    assert.equal(browserErrors.length, 0)
    assert.ok(document.querySelector('.admin-content'))
    assert.ok(document.querySelector('h1, h2'), 'route renders a visible heading in DOM')
    assert.doesNotMatch(document.body.textContent, /Unexpected Application Error|TypeError:/)
  })
}

for (const sprint of ['SP1', 'SP2', 'SP3', 'SP4']) {
  test(`${sprint}: slow list loading, empty result, search/filter request and offline error`, async () => {
    const Component = { SP1: MovieList, SP2: RoomList, SP3: EmployeeList, SP4: MemberList }[sprint]
    const pending = deferred()
    respond = (url) => url.includes('/statistics') || url.includes('/genres') ? normalResponse(url) : pending.promise
    await render(Component, { onNavigate() {} })
    assert.match(document.body.textContent + document.body.innerHTML, /Đang tải|skeleton/)
    await act(async () => pending.resolve(json(page([]))))
    assert.match(document.body.textContent, /Chưa có|Không có|chưa có/)
    respond = (url) => url.includes('/statistics') || url.includes('/genres') ? normalResponse(url) : json(page([]))
    const search = document.querySelector('input[type="search"], input[placeholder]')
    assert.ok(search)
    await input(search, 'Ánh sáng')
    await act(async () => { await new Promise((resolve) => setTimeout(resolve, 350)) })
    assert.ok(calls.some((call) => new URL(call.url).searchParams.get('keyword') === 'Ánh sáng'))
    const statusSelect = document.querySelector('select')
    respond = () => { throw new TypeError('Failed to fetch') }
    await act(async () => {
      statusSelect.value = [...statusSelect.options].find((option) => option.value !== '').value
      statusSelect.dispatchEvent(new Event('change', { bubbles: true }))
    })
    assert.match(document.body.textContent, /Không thể|không thể/)
    assert.equal(calls.filter((call) => ['POST', 'PUT', 'DELETE'].includes(call.method)).length, 0)
  })
}

for (const sprint of ['SP1', 'SP2', 'SP3']) {
  test(`${sprint}: destructive action is confirmed and API rejection stays inside dialog`, async () => {
    respond = (url, options) => {
      if (options.method === 'DELETE') return json({ message: 'Dữ liệu đang được sử dụng' }, 409)
      if (new URL(url).pathname === '/api/movies/admin') return json(page([movie]))
      return normalResponse(url)
    }
    await render({ SP1: MovieList, SP2: RoomList, SP3: EmployeeList }[sprint], { onNavigate() {} })
    const prefix = { SP1: 'Xóa phim', SP2: 'Xóa phòng', SP3: 'Ngừng hoạt động' }[sprint]
    await click(document.querySelector(`button[aria-label^="${prefix}"]`))
    assert.equal(calls.filter((c) => c.method === 'DELETE').length, 0)
    const confirm = button(prefix, document.querySelector('[role="dialog"]'))
    await act(async () => {
      confirm.dispatchEvent(new MouseEvent('click', { bubbles: true }))
      confirm.dispatchEvent(new MouseEvent('click', { bubbles: true }))
    })
    assert.equal(calls.filter((c) => c.method === 'DELETE').length, 1)
    assert.match(document.querySelector('[role="dialog"] [role="alert"]').textContent, /đang được sử dụng/)
    assert.equal(document.querySelector('.employee-toast'), null)
  })
}

test('SP3: pending edit blocks dismiss and repeated submits; success refreshes list and announces toast', async () => {
  await render(EmployeeList, { onNavigate() {} })
  await click(document.querySelector('button[aria-label^="Sửa"]'))
  const pending = deferred()
  respond = (url, options) => options.method === 'PUT' ? pending.promise : normalResponse(url)
  const form = document.querySelector('form')
  await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
  assert.equal(calls.filter((c) => c.method === 'PUT').length, 1)
  assert.equal(document.querySelector('.modal__close').disabled, true)
  await act(async () => window.dispatchEvent(new KeyboardEvent('keydown', { key: 'Escape' })))
  assert.ok(document.querySelector('[role="dialog"]'))
  await act(async () => pending.resolve(json(employee)))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.match(document.querySelector('.employee-toast[role="status"]').textContent, /thành công/)
})

const scheduled = { id: 90, movieId: 3, movieTitle: movie.title, roomId: 4, roomName: room.name, roomType: '2D', format: '2D', durationMinutes: 120, startTime: '2099-01-01T10:00:00', endTime: '2099-01-01T12:00:00', status: 'OPEN', totalSeats: 1, availableSeats: 1 }
function schedulingResponse(url) {
  const path = new URL(url).pathname
  if (path === '/api/movies/admin') return json(page([movie]))
  if (path === '/api/admin/showtimes') return json([scheduled])
  return normalResponse(url)
}
async function select(element, value) {
  await act(async () => { element.value = value; element.dispatchEvent(new Event('change', { bubbles: true })) })
}
async function fillSchedule() {
  await select(document.querySelectorAll('#schedule-form select')[0], '3')
  await select(document.querySelectorAll('#schedule-form select')[1], '4')
  await input(document.querySelector('#schedule-form input[type="datetime-local"]'), '2099-01-02T10:00')
}

test('Scheduling: creates via admin API once, computes end, blocks closing while pending and reloads selected date', async () => {
  respond = schedulingResponse
  await render(ShowtimeManagement)
  await click(button('Xếp lịch mới'))
  await submit(document.querySelector('#schedule-form'))
  assert.equal(calls.filter((c) => c.method === 'POST').length, 0)
  assert.ok(document.querySelector('#schedule-form [role="alert"]'))
  await fillSchedule()
  assert.match(document.querySelector('.schedule-end strong').textContent, /12:00/)
  const pending = deferred()
  respond = (url, options) => options.method === 'POST' ? pending.promise : schedulingResponse(url)
  const form = document.querySelector('#schedule-form')
  await act(async () => { form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })); form.dispatchEvent(new Event('submit', { bubbles: true, cancelable: true })) })
  const writes = calls.filter((c) => c.method === 'POST')
  assert.equal(writes.length, 1)
  assert.equal(new URL(writes[0].url).pathname, '/api/admin/showtimes')
  assert.deepEqual(JSON.parse(writes[0].body), { movieId: 3, roomId: 4, startTime: '2099-01-02T10:00:00', format: '2D' })
  assert.equal(document.querySelector('.modal__close').disabled, true)
  await act(async () => pending.resolve(json(scheduled, 201)))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.match(document.querySelector('.schedule-success').textContent, /Đã xếp lịch/)
  assert.ok(calls.some((c) => c.url.includes('date=2099-01-02')))
})

test('Scheduling: overlap error remains in modal with the draft; dirty close asks before discarding', async () => {
  respond = schedulingResponse
  await render(ShowtimeManagement)
  await click(button('Xếp lịch mới')); await fillSchedule()
  respond = (url, options) => options.method === 'POST' ? json({ message: 'Phòng đã có suất chiếu trong khung giờ này.' }, 409) : schedulingResponse(url)
  await submit(document.querySelector('#schedule-form'))
  assert.match(document.querySelector('#schedule-form [role="alert"]').textContent, /Phòng đã có suất/)
  assert.equal(document.querySelector('#schedule-form input').value, '2099-01-02T10:00')
  assert.equal(document.querySelector('.schedule-success'), null)
  await click(document.querySelector('.modal__close'))
  assert.equal(document.querySelectorAll('[role="dialog"]').length, 2)
})

test('Scheduling: edit uses PUT, keeps room fixed; cancellation asks confirmation and handles server rejection', async () => {
  respond = schedulingResponse
  await render(ShowtimeManagement)
  await click(document.querySelector('button[aria-label^="Sửa suất"]'))
  assert.equal(document.querySelectorAll('#schedule-form select')[1].disabled, true)
  await input(document.querySelector('#schedule-form input'), '2099-01-01T14:00')
  respond = (url, options) => options.method === 'PUT' ? json(scheduled) : schedulingResponse(url)
  await submit(document.querySelector('#schedule-form'))
  assert.ok(calls.some((c) => c.method === 'PUT' && c.url.endsWith('/admin/showtimes/90')))
  await click(document.querySelector('button[aria-label^="Hủy suất"]'))
  assert.equal(calls.filter((c) => c.url.endsWith('/cancel')).length, 0)
  respond = (url, options) => options.method === 'POST' ? json({ message: 'Suất chiếu đã có đặt vé hoặc ghế đang giữ.' }, 409) : schedulingResponse(url)
  await click(button('Hủy suất chiếu'))
  assert.match(document.querySelector('[role="dialog"] [role="alert"]').textContent, /đã có đặt vé/)
  assert.ok(document.querySelector('[role="dialog"]'))
  respond = (url, options) => options.method === 'POST' ? new Response(null, { status: 204 }) : schedulingResponse(url)
  await click(button('Hủy suất chiếu'))
  assert.equal(document.querySelector('[role="dialog"]'), null)
  assert.match(document.querySelector('.schedule-success').textContent, /Đã hủy suất/)
})

test('Scheduling: filtering and offline error with retry', async () => {
  respond = schedulingResponse
  await render(ShowtimeManagement)
  await input(document.querySelector('input[type="search"]'), 'khongtimthay')
  assert.match(document.querySelector('.movie-empty-state').textContent, /Chưa có suất/)
  await input(document.querySelector('input[type="search"]'), '')
  respond = () => { throw new TypeError('offline') }
  await click(button('Làm mới'))
  assert.match(document.querySelector('[role="alert"]').textContent, /Không thể kết nối/)
  respond = schedulingResponse
  await click(button('Thử lại'))
  assert.ok(document.querySelector('.schedule-table'))
})
