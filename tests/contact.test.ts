import assert from "node:assert/strict";
import test from "node:test";
import { buildContactMail, validateContact } from "../src/lib/contact.ts";
import {
    isRequestLimited,
    isSendLimited,
    readMailConfig,
    resetRateLimit,
    sendContactMail,
    transportOptions,
    type MailConfig,
} from "../src/server/mail.ts";

const validPayload = {
    name: "Ana Ruiz",
    email: "ana@example.com",
    subject: "Proyecto web",
    message: "Hola, quiero hablar sobre un proyecto.",
};

const mailConfig: MailConfig = {
    host: "mail.jamesrudas.online",
    port: 587,
    secure: false,
    user: "no-reply@jamesrudas.online",
    pass: "secret",
    from: "no-reply@jamesrudas.online",
    to: "contacto@jamesrudas.online",
};

test("accepts a complete contact payload", () => {
    const result = validateContact(validPayload);
    assert.equal(result.ok, true);
    if (!result.ok || result.spam) return;
    assert.deepEqual(result.data, validPayload);
});

test("rejects incomplete or invalid fields", () => {
    const result = validateContact({
        name: "A",
        email: "no-es-correo",
        subject: "Ok",
        message: "corto",
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.fields.name, "Escribe tu nombre (entre 2 y 80 caracteres).");
    assert.equal(result.fields.email, "Escribe un correo electrónico válido.");
    assert.equal(result.fields.subject, "Escribe un asunto (entre 3 y 120 caracteres).");
    assert.equal(result.fields.message, "El mensaje debe tener entre 10 y 5000 caracteres.");
});

test("rejects header injection in the subject", () => {
    const result = validateContact({
        ...validPayload,
        subject: "Hola\nBcc: spam@example.com",
    });

    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.equal(result.fields.subject, "El asunto contiene caracteres no permitidos.");
});

test("treats a filled honeypot as spam without validating the rest", () => {
    const result = validateContact({
        name: "",
        email: "",
        subject: "",
        message: "",
        leave_blank: "https://spam.example",
    });

    assert.deepEqual(result, { ok: true, spam: true });
});

test("builds a multipart mail with the site address as From and the visitor as Reply-To", () => {
    const result = validateContact({
        ...validPayload,
        message: "Hola <script>alert(1)</script>\nsegunda línea",
    });
    assert.equal(result.ok, true);
    if (!result.ok || result.spam) return;

    const mail = buildContactMail(result.data, mailConfig.from, mailConfig.to);

    assert.equal(mail.from, "no-reply@jamesrudas.online");
    assert.equal(mail.to, "contacto@jamesrudas.online");
    assert.deepEqual(mail.replyTo, { name: "Ana Ruiz", address: "ana@example.com" });
    assert.equal(mail.subject, "[Portafolio] Proyecto web");
    assert.match(mail.text, /Nombre: Ana Ruiz/);
    assert.match(mail.text, /Correo: ana@example.com/);
    assert.match(mail.text, /Asunto: Proyecto web/);
    assert.match(mail.text, /segunda línea/);
    assert.match(mail.html, /Nombre:/);
    assert.match(mail.html, /&lt;script&gt;alert\(1\)&lt;\/script&gt;/);
    assert.match(mail.html, /segunda línea|segunda l/);
    assert.match(mail.html, /<br>/);
    assert.equal(mail.html.includes("<script>"), false);
});

test("reports missing SMTP settings without throwing", () => {
    const result = readMailConfig({});
    assert.equal(result.ok, false);
    if (result.ok) return;
    assert.match(result.error, /SMTP_HOST/);
    assert.match(result.error, /SMTP_PASS/);
    assert.match(result.error, /MAIL_FROM/);
    assert.doesNotMatch(result.error, /MAIL_TO/);
});

test("defaults the recipient and uses STARTTLS when SMTP_SECURE=false", () => {
    const result = readMailConfig({
        SMTP_HOST: "mail.jamesrudas.online",
        SMTP_PORT: "587",
        SMTP_SECURE: "false",
        SMTP_USER: "no-reply@jamesrudas.online",
        SMTP_PASS: "secret",
        MAIL_FROM: "no-reply@jamesrudas.online",
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    assert.equal(result.config.to, "contacto@jamesrudas.online");
    assert.equal(result.config.secure, false);

    const options = transportOptions(result.config);
    assert.equal(options.port, 587);
    assert.equal(options.secure, false);
    assert.equal(options.requireTLS, true);
    assert.equal(options.auth.user, "no-reply@jamesrudas.online");
});

test("uses implicit TLS on port 465 when SMTP_SECURE is omitted", () => {
    const result = readMailConfig({
        SMTP_HOST: "mail.jamesrudas.online",
        SMTP_PORT: "465",
        SMTP_USER: "no-reply@jamesrudas.online",
        SMTP_PASS: "secret",
        MAIL_FROM: "James Rudas <no-reply@jamesrudas.online>",
        MAIL_TO: "contacto@jamesrudas.online",
    });

    assert.equal(result.ok, true);
    if (!result.ok) return;
    const options = transportOptions(result.config);
    assert.equal(options.secure, true);
    assert.equal(options.requireTLS, false);
});

test("sends through the injected transport without contacting SMTP", async () => {
    const sent: ContactMailCapture[] = [];
    await sendContactMail(validPayload, mailConfig, {
        async sendMail(mail) {
            sent.push(mail);
        },
    });

    assert.equal(sent.length, 1);
    assert.equal(sent[0].from, mailConfig.from);
    assert.equal(sent[0].replyTo.address, validPayload.email);
    assert.equal(sent[0].to, mailConfig.to);
});

test("rate limit allows a few requests and then blocks the same IP", () => {
    resetRateLimit();
    const now = Date.now();

    for (let attempt = 0; attempt < 30; attempt += 1) {
        assert.equal(isRequestLimited("203.0.113.10", now), false);
    }

    assert.equal(isRequestLimited("203.0.113.10", now), true);
    assert.equal(isRequestLimited("203.0.113.11", now), false);

    for (let attempt = 0; attempt < 5; attempt += 1) {
        assert.equal(isSendLimited("203.0.113.10", now), false);
    }

    assert.equal(isSendLimited("203.0.113.10", now), true);
    resetRateLimit();
});

type ContactMailCapture = {
    from: string;
    to: string;
    replyTo: { name: string; address: string };
    subject: string;
    text: string;
    html: string;
};
