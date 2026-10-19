import { useEffect, useRef, useState } from "react";
import type QrScanner from "qr-scanner";

type Status =
    | { kind: "starting" }
    | { kind: "scanning" }
    | { kind: "error"; message: string };

type Camera = { id: string; label: string };

type Props = {
    onDetected: (text: string) => void;
    onClose: () => void;
};

const CAMERA_KEY = "cinema.pickup.camera";

function readSavedCamera(): string | null {
    try {
        return window.localStorage.getItem(CAMERA_KEY);
    } catch {
        return null;
    }
}

function saveCamera(id: string) {
    try {
        window.localStorage.setItem(CAMERA_KEY, id);
    } catch {
    }
}

function cameraErrorMessage(err: unknown): string {
    const name = (err as { name?: string })?.name;
    const text = String((err as { message?: string })?.message ?? err ?? "");

    if (!window.isSecureContext) {
        return "Trình duyệt chỉ cho dùng camera trên https hoặc http://localhost. Hãy mở trang bằng localhost.";
    }
    if (name === "NotAllowedError" || name === "SecurityError") {
        return "Chưa được cấp quyền camera. Bấm biểu tượng camera trên thanh địa chỉ, chọn Cho phép rồi thử lại.";
    }
    if (name === "NotReadableError" || name === "TrackStartError") {
        return "Camera đang được ứng dụng khác dùng (Zoom, Teams, tab khác…). Tắt ứng dụng đó rồi thử lại.";
    }
    if (name === "NotFoundError" || /camera not found/i.test(text)) {
        return "Không tìm thấy camera trên máy này.";
    }
    return "Không mở được camera. Thử lại hoặc nhập mã bằng tay.";
}

export default function QrCameraScanner({ onDetected, onClose }: Props) {
    const videoRef = useRef<HTMLVideoElement>(null);
    const scannerRef = useRef<QrScanner | null>(null);
    const onDetectedRef = useRef(onDetected);
    const [status, setStatus] = useState<Status>({ kind: "starting" });
    const [cameras, setCameras] = useState<Camera[]>([]);
    const [cameraId, setCameraId] = useState<string | null>(readSavedCamera);
    const [attempt, setAttempt] = useState(0);

    useEffect(() => {
        onDetectedRef.current = onDetected;
    }, [onDetected]);

    useEffect(() => {
        const video = videoRef.current;
        if (!video) return;

        let cancelled = false;
        let done = false;

        setStatus({ kind: "starting" });

        (async () => {
            try {
                const { default: QrScannerLib } = await import("qr-scanner");
                if (cancelled) return;

                const scanner = new QrScannerLib(
                    video,
                    (result) => {
                        const text = result.data.trim();
                        if (done || !text) return;
                        done = true;
                        scanner.stop();
                        onDetectedRef.current(text);
                    },
                    {
                        returnDetailedScanResult: true,
                        preferredCamera: cameraId ?? "environment",
                        maxScansPerSecond: 12,
                        highlightScanRegion: true,
                        highlightCodeOutline: true,
                    },
                );
                scannerRef.current = scanner;

                await scanner.start();

                if (cancelled) {
                    scanner.destroy();
                    return;
                }

                setStatus({ kind: "scanning" });

                const list = await QrScannerLib.listCameras(true);
                if (!cancelled) setCameras(list);
            } catch (err) {
                if (!cancelled) setStatus({ kind: "error", message: cameraErrorMessage(err) });
            }
        })();

        return () => {
            cancelled = true;
            scannerRef.current?.destroy();
            scannerRef.current = null;
        };
    }, [cameraId, attempt]);

    useEffect(() => {
        function onKey(event: KeyboardEvent) {
            if (event.key === "Escape") onClose();
        }
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    }, [onClose]);

    function chooseCamera(id: string) {
        saveCamera(id);
        setCameraId(id);
    }

    return (
        <section className="tp-scanner" aria-label="Quét mã QR bằng camera">
            <div className="tp-scanner-head">
                <div>
                    <strong>Quét mã QR</strong>
                    <span>Đưa mã QR trên điện thoại / vé của khách vào giữa khung</span>
                </div>

                <div className="tp-scanner-tools">
                    {cameras.length > 1 && (
                        <select
                            value={cameraId ?? ""}
                            onChange={(event) => chooseCamera(event.target.value)}
                            aria-label="Chọn camera"
                        >
                            {!cameraId && <option value="">Camera mặc định</option>}
                            {cameras.map((camera, index) => (
                                <option key={camera.id} value={camera.id}>
                                    {camera.label || `Camera ${index + 1}`}
                                </option>
                            ))}
                        </select>
                    )}
                    <button type="button" className="tp-btn is-ghost" onClick={onClose}>
                        Đóng camera
                    </button>
                </div>
            </div>

            <div className={`tp-scanner-view is-${status.kind}`}>
                <video ref={videoRef} muted playsInline />

                {status.kind === "starting" && <div className="tp-scanner-msg">Đang mở camera…</div>}

                {status.kind === "error" && (
                    <div className="tp-scanner-msg is-error">
                        <span>{status.message}</span>
                        <button type="button" className="tp-btn is-ghost" onClick={() => setAttempt((n) => n + 1)}>
                            Thử lại
                        </button>
                    </div>
                )}
            </div>
        </section>
    );
}
