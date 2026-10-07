
export type QrPayment = {
    provider: "VIETQR";
    reference: string;
    amount: number;
    qrImageUrl: string;
    bankName?: string;
    accountNo?: string;
    accountName?: string;
    transferNote?: string;
};

const env = (import.meta as unknown as { env?: Record<string, string | undefined> }).env ?? {};


export const VIETQR_CONFIG = {
    bankId: env.VITE_VIETQR_BANK_ID ?? "",
    bankName: env.VITE_VIETQR_BANK_NAME ?? env.VITE_VIETQR_BANK_ID ?? "",
    accountNo: env.VITE_VIETQR_ACCOUNT_NO ?? "",
    accountName: env.VITE_VIETQR_ACCOUNT_NAME ?? "",
    template: env.VITE_VIETQR_TEMPLATE ?? "compact2",
};

export function isVietQrConfigured(): boolean {
    return Boolean(VIETQR_CONFIG.bankId && VIETQR_CONFIG.accountNo);
}


export function buildTransferNote(showtimeId: number): string {
    const suffix = Date.now().toString(36).toUpperCase().slice(-6);
    return `PC${showtimeId}${suffix}`.slice(0, 25);
}

export function createVietQrPayment(amount: number, transferNote: string): QrPayment {
    const { bankId, bankName, accountNo, accountName, template } = VIETQR_CONFIG;

    const params = new URLSearchParams({
        amount: String(Math.round(amount)),
        addInfo: transferNote,
    });

    if (accountName) {
        params.set("accountName", accountName);
    }

    return {
        provider: "VIETQR",
        reference: transferNote,
        amount,
        qrImageUrl: `https://img.vietqr.io/image/${encodeURIComponent(
            bankId
        )}-${encodeURIComponent(accountNo)}-${template}.png?${params.toString()}`,
        bankName,
        accountNo,
        accountName,
        transferNote,
    };
}