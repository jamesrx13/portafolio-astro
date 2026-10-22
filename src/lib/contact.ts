export type ContactPayload = {
    name: string;
    email: string;
    subject: string;
    message: string;
};

export type ContactField = keyof ContactPayload;

export type FieldErrors = Partial<Record<ContactField, string>>;

export type ContactValidation =
    | { ok: true; spam: true }
    | { ok: true; spam: false; data: ContactPayload }
    | { ok: false; error: string; fields: FieldErrors };

export type ContactMail = {
    from: string;
    to: string;
    replyTo: { name: string; address: string };
    subject: string;
    text: string;
    html: string;
};

const EMAIL_PATTERN = /^[^\s@<>"]+@[^\s@<>"]+\.[^\s@<>"]+$/;

const LIMITS = {
    name: { min: 2, max: 80 },
    email: { max: 254 },
    subject: { min: 3, max: 120 },
    message: { min: 10, max: 5000 },
} as const;

export function validateContact(input: unknown): ContactValidation {
    if (!input || typeof input !== "object" || Array.isArray(input)) {
        return {
            ok: false,
            error: "Los datos del formulario no son válidos.",
            fields: {},
        };
    }

    const body = input as Record<string, unknown>;

    if (honeypotFilled(body.leave_blank)) {
        return { ok: true, spam: true };
    }

    const name = asString(body.name);
    const email = asString(body.email);
    const subject = asString(body.subject);
    const message = asString(body.message);
    const fields: FieldErrors = {};

    if (name.length < LIMITS.name.min || name.length > LIMITS.name.max) {
        fields.name = "Escribe tu nombre (entre 2 y 80 caracteres).";
    } else if (hasDisallowedControls(name, false)) {
        fields.name = "El nombre contiene caracteres no permitidos.";
    }

    if (!EMAIL_PATTERN.test(email) || email.length > LIMITS.email.max) {
        fields.email = "Escribe un correo electrónico válido.";
    }

    if (subject.length < LIMITS.subject.min || subject.length > LIMITS.subject.max) {
        fields.subject = "Escribe un asunto (entre 3 y 120 caracteres).";
    } else if (hasDisallowedControls(subject, false)) {
        fields.subject = "El asunto contiene caracteres no permitidos.";
    }

    if (message.length < LIMITS.message.min || message.length > LIMITS.message.max) {
        fields.message = "El mensaje debe tener entre 10 y 5000 caracteres.";
    } else if (hasDisallowedControls(message, true)) {
        fields.message = "El mensaje contiene caracteres no permitidos.";
    }

    const firstError = Object.values(fields).find(Boolean);

    if (firstError) {
        return { ok: false, error: firstError, fields };
    }

    return {
        ok: true,
        spam: false,
        data: { name, email, subject, message },
    };
}

export function buildContactMail(data: ContactPayload, from: string, to: string): ContactMail {
    const text = [
        "Nuevo mensaje desde el formulario de contacto",
        "",
        `Nombre: ${data.name}`,
        `Correo: ${data.email}`,
        `Asunto: ${data.subject}`,
        "",
        "Mensaje:",
        data.message,
    ].join("\n");

    const html = `<!DOCTYPE html>
<html lang="es">
<head><meta charset="utf-8"></head>
<body>
  <p>Nuevo mensaje desde el formulario de contacto.</p>
  <p><strong>Nombre:</strong> ${escapeHtml(data.name)}</p>
  <p><strong>Correo:</strong> <a href="mailto:${escapeHtml(data.email)}">${escapeHtml(data.email)}</a></p>
  <p><strong>Asunto:</strong> ${escapeHtml(data.subject)}</p>
  <p><strong>Mensaje:</strong></p>
  <div>${formatMessageHtml(data.message)}</div>
</body>
</html>`;

    return {
        from,
        to,
        replyTo: {
            name: data.name,
            address: data.email,
        },
        subject: `[Portafolio] ${data.subject}`,
        text,
        html,
    };
}

export function escapeHtml(value: string): string {
    return value
        .replaceAll("&", "&amp;")
        .replaceAll("<", "&lt;")
        .replaceAll(">", "&gt;")
        .replaceAll('"', "&quot;")
        .replaceAll("'", "&#39;");
}

function formatMessageHtml(message: string): string {
    return escapeHtml(message).replaceAll("\r\n", "\n").replaceAll("\n", "<br>");
}

function asString(value: unknown): string {
    return typeof value === "string" ? value.trim() : "";
}

function honeypotFilled(value: unknown): boolean {
    if (typeof value === "string") return value.trim() !== "";
    if (value == null) return false;
    return String(value).trim() !== "";
}

function hasDisallowedControls(value: string, allowNewlines: boolean): boolean {
    const pattern = allowNewlines
        ? /[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/
        : /[\u0000-\u001F\u007F]/;

    return pattern.test(value);
}
