import { validateContact } from "../lib/contact.ts";

// VARIABLES
const roles = [
    "Desarrollador Fullstack",
    "Desarrollador Frontend",
    "Desarrollador Backend",
    "Desarrollador Mobile",
    "Diseñador Web",
];

let i = 0;
let j = 0;
let deleting = false;
const speed = 100;
const pause = 1500;

// FUNCIONES
const onScroll = () => {
    const nav = document.querySelector("nav");

    if (window.scrollY > 100) {

        nav.classList.add("onScroll");

        nav.addEventListener("animationend", () => {

            nav.classList.remove("onScroll");
            if (nav.querySelector("ul").classList.contains("open")) return;
            nav.classList.add("scrolled");

        });

    } else if (window.scrollY <= 100) {

        if (nav.classList.contains("onScroll")) {

            nav.classList.remove("scrolled");
            nav.classList.add("offScroll");

            nav.addEventListener("animationend", () => {
                nav.classList.remove("offScroll");
                nav.classList.remove("scrolled");
            });

        }

    }
}

const typeEffect = () => {

    const typingEl = document.querySelector(".typing");

    const current = roles[i];

    if (!deleting) {
        typingEl.textContent = current.slice(0, j++);
        if (j > current.length) {
            deleting = true;
            setTimeout(typeEffect, pause);
            return;
        }
    } else {
        typingEl.textContent = current.slice(0, j--);
        if (j < 0) {
            deleting = false;
            i = (i + 1) % roles.length;
            j = 0;
        }
    }

    setTimeout(typeEffect, deleting ? speed / 2 : speed);
}

const toggleMenu = () => {

    const openMenuBtn = document.getElementById("open-menu");
    const nav = document.querySelector("nav");
    const menu = nav.querySelector("ul");

    openMenuBtn.addEventListener("click", () => {
        nav.classList.remove("scrolled");
        menu.classList.add("open");
    });

    menu.querySelectorAll("li").forEach(item => {

        item.addEventListener("click", () => {

            menu.classList.remove("open");
            menu.classList.add("close");

            menu.addEventListener("animationend", () => {
                menu.classList.remove("close");
            });

            if (window.scrollY > 100) {
                nav.classList.add("scrolled");
                console.log('Menu add scrolled');
            }
        });

    })

}

const progressAnimation = () => {
    const progress = document.querySelectorAll(".progress");

    const observer = new IntersectionObserver((entries) => {

        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const percentage = entry.target.getAttribute("data-value");
                entry.target.style.width = `${percentage}%`;
                entry.target.addEventListener('transitionend', () => {
                    entry.target.innerHTML = `<span>${percentage}%</span>`;
                });
                observer.unobserve(entry.target);
            }
        });

    }, {
        threshold: 0.2
    });

    progress.forEach(element => {
        observer.observe(element)
    });

}

let alertTimer = null;
let sending = false;

const hideAlert = () => {

    const alertBox = document.getElementById("alert-message");

    if (
        !alertBox.classList.contains("info") &&
        !alertBox.classList.contains("error") &&
        !alertBox.classList.contains("success")
    ) {
        return;
    }

    alertBox.classList.add("onHide");

    alertBox.addEventListener("animationend", () => {
        alertBox.classList.remove("onHide");
        alertBox.classList.remove("info");
        alertBox.classList.remove("error");
        alertBox.classList.remove("success");
        alertBox.querySelector("span").textContent = "";
    }, { once: true });

}

const showAlert = (kind, message) => {

    const alertBox = document.getElementById("alert-message");

    alertBox.classList.remove("onHide", "info", "error", "success");
    alertBox.classList.add(kind);
    alertBox.querySelector("span").textContent = message;

    if (alertTimer) clearTimeout(alertTimer);

    alertTimer = setTimeout(() => {
        hideAlert();
    }, 7000);

}

const safeErrorMessage = (payload) => {

    const fallback = "¡Vaya! ha ocurrido un error inesperado. Por favor, inténtalo de nuevo más tarde.";

    if (!payload || typeof payload.error !== "string") return fallback;

    const message = payload.error.trim();

    if (!message || message.length > 240) return fallback;

    return message;

}

const applyFieldErrors = (frm, fields) => {

    if (!fields) return;

    Object.entries(fields).forEach(([name, message]) => {

        if (!message) return;

        const field = frm.querySelector(`[name="${name}"]`);

        if (!field) return;

        field.classList.add("error");
        field.setAttribute("aria-invalid", "true");

        field.addEventListener("focus", () => {
            field.classList.remove("error");
            field.removeAttribute("aria-invalid");
        }, { once: true });

    });

}

const setSending = (isSending) => {

    const btn = document.getElementById("send-message-btn");

    btn.disabled = isSending;
    btn.setAttribute("aria-busy", isSending ? "true" : "false");

    if (isSending) {
        btn.innerHTML = `<span class="spinner" role="status" aria-label="Enviando"></span>`;
    } else {
        btn.textContent = "Enviar";
    }

}

const inputsAnimation = () => {

    const inputs = document.querySelectorAll("input, textarea");

    inputs.forEach(input => {

        if (input.name === "leave_blank") return;

        const label = input.parentNode.querySelector("label");

        if (!label) return;

        input.addEventListener("focus", () => {
            label.classList.remove("onBlur");
            label.classList.add("onFocus");

            input.classList.add("hidePlaceholder");
        });

        input.addEventListener("blur", () => {

            if (input.value === "") {

                label.classList.remove("onFocus");
                label.classList.add("onBlur");

                label.addEventListener("animationend", () => {
                    label.classList.remove("onBlur");

                    if (!label.classList.contains("onFocus")) {
                        input.classList.remove("hidePlaceholder");
                    }

                });

            }

        });

    });

}

const sendMessage = async (data) => {

    if (sending) return;

    sending = true;
    const frm = document.getElementById("contact-form");

    try {

        setSending(true);

        const response = await fetch("/api/contact", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Accept": "application/json",
            },
            body: JSON.stringify(data),
        });

        let payload = {};

        try {
            payload = await response.json();
        } catch {
            payload = {};
        }

        if (response.ok && payload.ok) {

            showAlert("success", "¡Hola! he recibido tu mensaje y me pondré en contacto contigo lo antes posible. Gracias por contactarme.");

            frm.reset();

            frm.querySelectorAll("input, textarea").forEach((field) => {
                field.classList.remove("error");
                field.removeAttribute("aria-invalid");
                field.dispatchEvent(new Event("blur"));
            });

            return;

        }

        applyFieldErrors(frm, payload.fields);
        showAlert("error", safeErrorMessage(payload));

    } catch (error) {

        showAlert("error", "¡Vaya! ha ocurrido un error inesperado. Por favor, inténtalo de nuevo más tarde.");

    } finally {

        sending = false;
        setSending(false);

    }

}

const onSubmitFrm = () => {

    const frm = document.getElementById("contact-form");

    frm.addEventListener("submit", (event) => {

        event.preventDefault();

        const data = {};

        frm.querySelectorAll("input, textarea").forEach((field) => {
            field.classList.remove("error");
            field.removeAttribute("aria-invalid");
            data[field.name] = field.value;
        });

        const result = validateContact(data);

        if (!result.ok) {
            applyFieldErrors(frm, result.fields);
            showAlert("error", result.error);
            return;
        }

        sendMessage({
            name: data.name ?? "",
            email: data.email ?? "",
            subject: data.subject ?? "",
            message: data.message ?? "",
            leave_blank: data.leave_blank ?? "",
        });

    });

}

// EVENTOS
document.addEventListener("scroll", onScroll);

document.addEventListener("DOMContentLoaded", () => {
    typeEffect();
    toggleMenu();
    progressAnimation();
    inputsAnimation();
    onSubmitFrm();
    onScroll(); // Se añade para que al recargar la página en una posición diferente a la inicial
});