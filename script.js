/* =========================================================
   Lujs.dev — interações em JavaScript moderno (sem frameworks)
   ========================================================= */

( () => {
    "use strict";

    const root = document.documentElement;
    const THEME_KEY = "lujs-theme";

    /* ---------- Tema (dark como padrão, persistido) ---------- */
    const themeBtn = document.querySelector("[data-theme-toggle]");

    const readStore = (key) => {
        try {
            return localStorage.getItem(key);
        } catch {
            return null;
        }
    }
    ;

    const writeStore = (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch {/* storage indisponível — apenas ignora */
        }
    }
    ;

    const storedTheme = readStore(THEME_KEY);
    if (storedTheme === "light" || storedTheme === "dark") {
        root.dataset.theme = storedTheme;
    }

    const syncThemeLabel = () => {
        if (!themeBtn)
            return;
        const isDark = root.dataset.theme !== "light";
        themeBtn.setAttribute("aria-label", isDark ? "Mudar para tema claro" : "Mudar para tema escuro", );
    }
    ;

    syncThemeLabel();

    themeBtn?.addEventListener("click", () => {
        const next = root.dataset.theme === "light" ? "dark" : "light";
        root.dataset.theme = next;
        writeStore(THEME_KEY, next);
        syncThemeLabel();
    }
    );

    /* ---------- Menu mobile ---------- */
    const navToggle = document.querySelector(".nav-toggle");
    const navMenu = document.getElementById("nav-menu");

    const closeMenu = () => {
        navMenu?.classList.remove("is-open");
        navToggle?.classList.remove("is-open");
        navToggle?.setAttribute("aria-expanded", "false");
        navToggle?.setAttribute("aria-label", "Abrir menu");
    }
    ;

    navToggle?.addEventListener("click", () => {
        const open = !navMenu?.classList.contains("is-open");
        navMenu?.classList.toggle("is-open", open);
        navToggle.classList.toggle("is-open", open);
        navToggle.setAttribute("aria-expanded", String(open));
        navToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    }
    );

    navMenu?.querySelectorAll("a").forEach( (link) => {
        link.addEventListener("click", closeMenu);
    }
    );

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape")
            closeMenu();
    }
    );

    /* ---------- Header com estado ao rolar ---------- */
    const header = document.querySelector(".site-header");

    const syncHeader = () => {
        header?.classList.toggle("is-scrolled", window.scrollY > 6);
    }
    ;

    window.addEventListener("scroll", syncHeader, {
        passive: true
    });
    syncHeader();

    /* ---------- Links ativos na navbar ---------- */
    const navLinks = [...document.querySelectorAll(".nav-links a")];
    const sections = [...document.querySelectorAll("main section[id]")];

    const setActiveLink = (id) => {
        navLinks.forEach( (link) => {
            const match = link.getAttribute("href") === `#${id}`;
            if (match) {
                link.setAttribute("aria-current", "location");
            } else {
                link.removeAttribute("aria-current");
            }
        }
        );
    }
    ;

    if ("IntersectionObserver" in window && sections.length) {
        const sectionObserver = new IntersectionObserver( (entries) => {
            entries.forEach( (entry) => {
                if (entry.isIntersecting)
                    setActiveLink(entry.target.id);
            }
            );
        }
        ,{
            rootMargin: "-45% 0px -50% 0px",
            threshold: 0
        },);

        sections.forEach( (section) => sectionObserver.observe(section));
    }

    /* ---------- Reveal on scroll ---------- */
    const revealItems = [...document.querySelectorAll(".reveal")];

    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver( (entries, observer) => {
            entries.forEach( (entry) => {
                if (entry.isIntersecting) {
                    entry.target.classList.add("is-visible");
                    observer.unobserve(entry.target);
                }
            }
            );
        }
        ,{
            threshold: 0.12,
            rootMargin: "0px 0px -60px 0px"
        },);

        revealItems.forEach( (item) => revealObserver.observe(item));
    } else {
        revealItems.forEach( (item) => item.classList.add("is-visible"));
    }

    /* ---------- Animação do console (linha a linha) ---------- */
    const consoleEl = document.querySelector(".console");

    if (consoleEl) {
        consoleEl.querySelectorAll(".cline").forEach( (line, index) => {
            line.style.setProperty("--i", String(index));
        }
        );

        const runConsole = () => consoleEl.classList.add("run");

        if ("IntersectionObserver" in window) {
            const consoleObserver = new IntersectionObserver( (entries, observer) => {
                entries.forEach( (entry) => {
                    if (entry.isIntersecting) {
                        runConsole();
                        observer.unobserve(entry.target);
                    }
                }
                );
            }
            ,{
                threshold: 0.3
            },);

            consoleObserver.observe(consoleEl);
        } else {
            runConsole();
        }
    }

    /* ---------- Ano do rodapé ---------- */
    const yearEl = document.getElementById("year");
    if (yearEl)
        yearEl.textContent = String(new Date().getFullYear());
}
)();