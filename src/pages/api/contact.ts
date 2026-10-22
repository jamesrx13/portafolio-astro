import type { APIRoute } from "astro";
import { escapeHtml, validateContact } from "../../lib/contact.ts";
import {
    isRequestLimited,
    isSendLimited,
    normalizeIp,
    readMailConfig,
    sendContactMail,
} from "../../server/mail.ts";

export const prerender = false;

const MAX_BODY_BYTES = 32 * 1024;

type ErrorBody = {
    ok: false;
    error: string;
    fields?: Record<string, string>;
};

type SuccessBody = {
    ok: true;
};

export const POST: APIRoute = async ({ request, clientAddress, url }) => {
    try {
        if (!isAllowedOrigin(request, url)) {
            return respond(request, {
                ok: false,
                error: "No se pudo enviar el formulario desde este origen.",
            }, 403);
        }

        const declaredLength = Number(request.headers.get("content-length") ?? "0");
        if (Number.isFinite(declaredLength) && declaredLength > MAX_BODY_BYTES) {
            return respond(request, {
                ok: false,
                error: "El mensaje es demasiado grande.",
            }, 413);
        }

        const payload = await readPayload(request);
        if (!payload.ok) return payload.response;

        const validated = validateContact(payload.value);
        if (validated.ok && validated.spam) {
            return respond(request, { ok: true }, 200);
        }

        const ip = normalizeIp(readClientAddress(clientAddress));
        if (isRequestLimited(ip)) {
            return respond(request, {
                ok: false,
                error: "Has enviado varios mensajes seguidos. Espera unos minutos e inténtalo de nuevo.",
            }, 429, { "retry-after": "600" });
        }

        if (!validated.ok) {
            return respond(request, {
                ok: false,
                error: validated.error,
                fields: validated.fields,
            }, 400);
        }

        const mailConfig = readMailConfig();
        if (!mailConfig.ok) {
            console.error(`[contact] ${mailConfig.error}`);
            return respond(request, {
                ok: false,
                error: "El formulario no está disponible en este momento. Inténtalo más tarde.",
            }, 503);
        }

        if (isSendLimited(ip)) {
            return respond(request, {
                ok: false,
                error: "Has enviado varios mensajes seguidos. Espera unos minutos e inténtalo de nuevo.",
            }, 429, { "retry-after": "600" });
        }

        try {
            await sendContactMail(validated.data, mailConfig.config);
        } catch (error) {
            const message = error instanceof Error ? error.message : "error desconocido";
            console.error(`[contact] Falló el envío SMTP: ${message}`);
            return respond(request, {
                ok: false,
                error: "No se pudo enviar el mensaje. Inténtalo de nuevo más tarde.",
            }, 502);
        }

        return respond(request, { ok: true }, 200);
    } catch (error) {
        const message = error instanceof Error ? error.message : "error desconocido";
        console.error(`[contact] Error inesperado: ${message}`);
        return respond(request, {
            ok: false,
            error: "Ha ocurrido un error inesperado. Inténtalo de nuevo más tarde.",
        }, 500);
    }
};

async function readPayload(request: Request): Promise<
    | { ok: true; value: unknown }
    | { ok: false; response: Response }
> {
    const contentType = request.headers.get("content-type") ?? "";

    try {
        if (contentType.includes("application/json")) {
            const raw = await request.text();
            if (raw.length > MAX_BODY_BYTES) {
                return {
                    ok: false,
                    response: respond(request, {
                        ok: false,
                        error: "El mensaje es demasiado grande.",
                    }, 413),
                };
            }

            return { ok: true, value: JSON.parse(raw) };
        }

        if (
            contentType.includes("application/x-www-form-urlencoded")
            || contentType.includes("multipart/form-data")
        ) {
            const form = await request.formData();
            return {
                ok: true,
                value: {
                    name: formString(form.get("name")),
                    email: formString(form.get("email")),
                    subject: formString(form.get("subject")),
                    message: formString(form.get("message")),
                    leave_blank: formString(form.get("leave_blank")),
                },
            };
        }
    } catch {
        return {
            ok: false,
            response: respond(request, {
                ok: false,
                error: "No se pudo leer el formulario.",
            }, 400),
        };
    }

    return {
        ok: false,
        response: respond(request, {
            ok: false,
            error: "Formato de envío no soportado.",
        }, 415),
    };
}

function formString(value: FormDataEntryValue | null): string {
    return typeof value === "string" ? value : "";
}

function readClientAddress(clientAddress: string | undefined): string | undefined {
    try {
        return clientAddress;
    } catch {
        return undefined;
    }
}

function isAllowedOrigin(request: Request, url: URL): boolean {
    const origin = request.headers.get("origin");
    if (!origin) return true;

    try {
        return new URL(origin).host === url.host;
    } catch {
        return false;
    }
}

function respond(
    request: Request,
    body: SuccessBody | ErrorBody,
    status: number,
    extraHeaders: Record<string, string> = {},
): Response {
    const headers = {
        "cache-control": "no-store",
        ...extraHeaders,
    };

    if (wantsHtml(request)) {
        const message = body.ok
            ? "Recibí tu mensaje y te responderé lo antes posible. Gracias por contactarme."
            : body.error;

        return new Response(htmlPage(message), {
            status,
            headers: {
                ...headers,
                "content-type": "text/html; charset=utf-8",
            },
        });
    }

    return new Response(JSON.stringify(body), {
        status,
        headers: {
            ...headers,
            "content-type": "application/json; charset=utf-8",
        },
    });
}

function wantsHtml(request: Request): boolean {
    const contentType = request.headers.get("content-type") ?? "";
    if (contentType.includes("application/json")) return false;
    return (request.headers.get("accept") ?? "").includes("text/html");
}

function htmlPage(message: string): string {
    return `<!DOCTYPE html>
<html lang="es">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <title>Contacto</title>
</head>
<body style="font-family: sans-serif; max-width: 36rem; margin: 4rem auto; padding: 1rem; line-height: 1.5;">
  <p>${escapeHtml(message)}</p>
  <p><a href="/#contacto">Volver al formulario</a></p>
</body>
</html>`;
}
