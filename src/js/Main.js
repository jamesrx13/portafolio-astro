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

const hideAlert = () => {

    const alertBox = document.getElementById("alert-message");

    alertBox.classList.add("onHide");

    alertBox.addEventListener("animationend", () => {
        alertBox.classList.remove("onHide");
        alertBox.classList.remove("info");
        alertBox.classList.remove("error");
        alertBox.querySelector("span").textContent = "";
    })

}

const inputsAnimation = () => {

    const inputs = document.querySelectorAll("input, textarea");

    inputs.forEach(input => {

        const label = input.parentNode.querySelector("label")

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

    try {

        const _url = "https://api.jamesrudas.com/api/send-message"

        const btn = document.getElementById("send-message-btn");
        const alertBox = document.getElementById("alert-message");
        const frm = document.querySelector("form");

        btn.disabled = true;

        btn.innerHTML = `<div class="spinner"></div>`

        const _response = await fetch(_url, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(data)
        });

        if (_response.ok) {

            alertBox.classList.remove("error");
            alertBox.classList.add("info");
            alertBox.querySelector("span").textContent = "¡Hola! he recibido tu mensaje y me pondré en contacto contigo lo antes posible. Gracias por contactarme.";

            frm.reset();

            frm.querySelectorAll("input, textarea").forEach(e => {
                e.dispatchEvent(new Event('blur'));
            });

        } else {
            alertBox.classList.remove("info");
            alertBox.classList.add("error");
            alertBox.querySelector("span").textContent = "¡Vaya! ha ocurrido un error inesperado. Por favor, inténtalo de nuevo más tarde.";
        }

        btn.textContent = "Enviar";
        btn.disabled = false;

        setTimeout(() => {
            hideAlert();
        }, 5000)

    } catch (error) {
        const alertBox = document.getElementById("alert-message");
        const btn = document.getElementById("send-message-btn");

        alertBox.classList.remove("info");
        alertBox.classList.add("error");
        alertBox.querySelector("span").textContent = "¡Vaya! ha ocurrido un error inesperado. Por favor, inténtalo de nuevo más tarde.";

        btn.textContent = "Enviar";
        btn.disabled = false;

        setTimeout(() => {
            hideAlert();
        }, 5000)

    }

}

const onSubmitFrm = () => {

    const frm = document.querySelector("form");

    frm.addEventListener("submit", (e) => {

        e.preventDefault();

        const promises = [];

        const inputs = frm.querySelectorAll("input, textarea");

        const dataToSend = {}

        inputs.forEach(input => {

            input.classList.remove("error");

            promises.push(new Promise((resolve, reject) => {

                setTimeout(() => {
                    if (input.value === "") {

                        input.classList.add("error");

                        input.addEventListener("focus", () => {
                            input.classList.remove("error");
                        });

                        reject();

                    } else {

                        dataToSend[input.name] = input.value;

                        resolve();

                    }
                })

            }))

        });

        Promise.all(promises)
            .then(() => {
                sendMessage(dataToSend);
            })
            .catch(() => { })
    })

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