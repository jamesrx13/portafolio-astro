import nodemailer from "nodemailer";
import { buildContactMail, type ContactMail, type ContactPayload } from "../lib/contact.ts";

export type MailConfig = {
    host: string;
    port: number;
    secure: boolean;
    user: string;
    pass: string;
    from: string;
    to: string;
};

export type MailConfigResult =
    | { ok: true; config: MailConfig }
    | { ok: false; error: string };

export type TransportOptions = {
    host: string;
    port: number;
    secure: boolean;
    requireTLS: boolean;
    auth: { user: string; pass: string };
    connectionTimeout: number;
    greetingTimeout: number;
    socketTimeout: number;
    tls: { minVersion: "TLSv1.2" };
};

type MailSender = {
    sendMail: (mail: ContactMail) => Promise<unknown>;
    close?: () => void;
};

const PLAIN_EMAIL = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;
const NAMED_EMAIL = /^[^<>\r\n]+<\s*[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+\s*>$/;

const DEFAULT_MAIL_TO = "contacto@jamesrudas.online";

const POST_WINDOW_MS = 10 * 60 * 1000;
const POST_LIMIT = 30;
const SEND_WINDOW_MS = 10 * 60 * 1000;
const SEND_LIMIT = 5;

const hits = {
    posts: new Map<string, number[]>(),
    sends: new Map<string, number[]>(),
};

export function readMailConfig(env: NodeJS.ProcessEnv = process.env): MailConfigResult {
    const host = env.SMTP_HOST?.trim() ?? "";
    const portRaw = env.SMTP_PORT?.trim() ?? "";
    const user = env.SMTP_USER?.trim() ?? "";
    const pass = env.SMTP_PASS ?? "";
    const from = env.MAIL_FROM?.trim() ?? "";
    const to = env.MAIL_TO?.trim() || DEFAULT_MAIL_TO;
    const secureRaw = env.SMTP_SECURE?.trim().toLowerCase() ?? "";

    const missing: string[] = [];
    if (!host) missing.push("SMTP_HOST");
    if (!portRaw) missing.push("SMTP_PORT");
    if (!user) missing.push("SMTP_USER");
    if (!pass) missing.push("SMTP_PASS");
    if (!from) missing.push("MAIL_FROM");

    if (missing.length > 0) {
        return {
            ok: false,
            error: `Faltan variables de entorno: ${missing.join(", ")}`,
        };
    }

    if (/\s/.test(host) || host.length > 253) {
        return { ok: false, error: "SMTP_HOST no es un host válido" };
    }

    if (!/^\d+$/.test(portRaw)) {
        return { ok: false, error: "SMTP_PORT no es un puerto válido" };
    }

    const port = Number(portRaw);
    if (!Number.isInteger(port) || port < 1 || port > 65535) {
        return { ok: false, error: "SMTP_PORT no es un puerto válido" };
    }

    let secure: boolean;
    if (secureRaw === "") {
        secure = port === 465;
    } else if (secureRaw === "true" || secureRaw === "1") {
        secure = true;
    } else if (secureRaw === "false" || secureRaw === "0") {
        secure = false;
    } else {
        return { ok: false, error: "SMTP_SECURE debe ser true o false" };
    }

    if (!isMailAddress(from)) {
        return { ok: false, error: "MAIL_FROM no es un correo válido" };
    }

    if (!isMailAddress(to)) {
        return { ok: false, error: "MAIL_TO no es un correo válido" };
    }

    return {
        ok: true,
        config: { host, port, secure, user, pass, from, to },
    };
}

export function transportOptions(config: MailConfig): TransportOptions {
    return {
        host: config.host,
        port: config.port,
        secure: config.secure,
        requireTLS: !config.secure,
        auth: {
            user: config.user,
            pass: config.pass,
        },
        connectionTimeout: 10_000,
        greetingTimeout: 10_000,
        socketTimeout: 20_000,
        tls: { minVersion: "TLSv1.2" },
    };
}

export async function sendContactMail(
    data: ContactPayload,
    config: MailConfig,
    sender?: MailSender,
): Promise<void> {
    const mail = buildContactMail(data, config.from, config.to);

    if (sender) {
        await sender.sendMail(mail);
        return;
    }

    const transporter = nodemailer.createTransport(transportOptions(config));

    try {
        await transporter.sendMail(mail);
    } finally {
        transporter.close();
    }
}

export function normalizeIp(ip: string | undefined): string {
    const value = ip?.trim() ?? "";
    if (!value) return "unknown";
    return value.slice(0, 128);
}

export function isRequestLimited(ip: string, now = Date.now()): boolean {
    return consume(hits.posts, ip, POST_LIMIT, POST_WINDOW_MS, now);
}

export function isSendLimited(ip: string, now = Date.now()): boolean {
    return consume(hits.sends, ip, SEND_LIMIT, SEND_WINDOW_MS, now);
}

export function resetRateLimit(): void {
    hits.posts.clear();
    hits.sends.clear();
}

function consume(
    bucket: Map<string, number[]>,
    ip: string,
    max: number,
    windowMs: number,
    now: number,
): boolean {
    const recent = (bucket.get(ip) ?? []).filter((timestamp) => now - timestamp < windowMs);

    if (recent.length >= max) {
        bucket.set(ip, recent);
        return true;
    }

    recent.push(now);
    bucket.set(ip, recent);

    if (bucket.size > 5000) {
        for (const [key, timestamps] of bucket) {
            if (timestamps.every((timestamp) => now - timestamp >= windowMs)) {
                bucket.delete(key);
            }
        }
    }

    return false;
}

function isMailAddress(value: string): boolean {
    if (/[\r\n]/.test(value)) return false;
    return PLAIN_EMAIL.test(value) || NAMED_EMAIL.test(value);
}
