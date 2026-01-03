type Callback = (err: Error | null, allow?: boolean) => void;

const normalizeOrigin = (origin?: string) =>
    origin?.replace(/\/$/, "");

const allowedOrigins = new Set([
    process.env.CLIENT_URL,
    "http://localhost:5173"
])

export const corsConfig = {
    origin: (origin: string | undefined, callback: Callback) => {
        if (!origin) return callback(null, true);

        const normalizedOrigin = normalizeOrigin(origin);
        if (allowedOrigins.has(normalizedOrigin)) {
            callback(null, true);
        } else {
            callback(new Error("CORS blocked"));
        }
    },
    credentials: true,
}