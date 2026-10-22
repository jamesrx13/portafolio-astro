# Portafolio de James Rudas

Sitio personal en Astro. La página se prerenderiza y el formulario **Contáctame** envía el correo en el servidor, con [nodemailer](https://nodemailer.com/), hacia el SMTP propio.

## Desarrollo

```sh
npm install
cp .env.example .env
npm run dev
```

El sitio local queda en `http://localhost:4321`. Sin variables SMTP la página carga igual; el envío responde con un error controlado.

| Comando | Acción |
| :------ | :----- |
| `npm run dev` | Servidor de desarrollo |
| `npm run build` | Genera `dist/` (cliente y servidor) |
| `npm start` | Arranca el servidor de producción (`dist/server/entry.mjs`) |
| `npm test` | Validación del formulario, el correo y el límite de envíos |

## Variables de entorno

Se leen en el proceso de Node al recibir `POST /api/contact`. No forman parte del JavaScript del navegador.

| Variable | Obligatoria | Descripción |
| :------- | :---------- | :---------- |
| `SMTP_HOST` | Sí | Host SMTP. En producción: `mail.jamesrudas.online`. |
| `SMTP_PORT` | Sí | `587` con STARTTLS o `465` con SSL. |
| `SMTP_SECURE` | No | `false` fuerza STARTTLS. `true` usa SSL implícito. Si se omite, el puerto `465` activa SSL y cualquier otro puerto usa STARTTLS. |
| `SMTP_USER` | Sí | Usuario autenticado en Stalwart. |
| `SMTP_PASS` | Sí | Contraseña de esa cuenta. |
| `MAIL_FROM` | Sí | Cabecera `From`, una dirección del propio dominio. En producción: `no-reply@jamesrudas.online`. |
| `MAIL_TO` | No | Destino. Por defecto `contacto@jamesrudas.online`. |

Ejemplo para el correo real:

```sh
SMTP_HOST=mail.jamesrudas.online
SMTP_PORT=587
SMTP_SECURE=false
SMTP_USER=la-cuenta-smtp
SMTP_PASS=la-contraseña
MAIL_FROM=no-reply@jamesrudas.online
MAIL_TO=contacto@jamesrudas.online
```

`SMTP_SECURE=false` negocia STARTTLS en el puerto 587. Para el puerto 465 usa `SMTP_PORT=465` y `SMTP_SECURE=true`.

El mensaje sale con `From` en `MAIL_FROM` y `Reply-To` del visitante. El cuerpo incluye nombre, correo, asunto y mensaje, en HTML y en texto plano.

Copia `.env.example` a `.env` en local. No subas `.env` al repositorio.

## Despliegue en Dokploy

Dokploy construye con el `Dockerfile` de la raíz y despliega la rama `master`. La imagen resultante es un servidor Node (`@astrojs/node` en modo `standalone`), no Nginx.

El contenedor escucha en el **puerto 80** (`HOST=0.0.0.0`, `PORT=80`). No hace falta cambiar el puerto publicado en Dokploy.

En el servicio, configura las variables de la tabla como **entorno de ejecución** del contenedor. Un argumento solo de build no llega al proceso que envía el correo. Si faltan o el SMTP rechaza el envío, la web sigue en línea y `POST /api/contact` responde JSON (`503` si falta configuración, `502` si el servidor de correo falla).

## Formulario

`POST /api/contact` acepta JSON o un formulario HTML con `name`, `email`, `subject` y `message`. El campo oculto `leave_blank` es un honeypot: si viene relleno, la respuesta es de éxito y no se envía correo. También hay un límite por IP (30 peticiones y 5 envíos reales cada 10 minutos). El navegador valida antes de llamar al servidor y muestra carga, éxito o error. Un envío correcto vacía el formulario.
