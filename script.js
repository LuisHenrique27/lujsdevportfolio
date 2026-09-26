/* =========================================================
   Lujs.dev — interações em JavaScript moderno (sem frameworks)
   ========================================================= */

(() => {
    "use strict";

    /* =====================================================
       CONFIG — Projetos GitHub (edite aqui)
       ===================================================== */
    // Usuário padrão carregado ao abrir a página. Pode ser trocado ao vivo no campo “GitHub user”.
    const GITHUB_USERNAME_DEFAULT = "LuisHenrique27";
    // Repositórios a ocultar automaticamente (nome exato do repo, case-sensitive).
    // Ex.: ["meu-repo-antigo", "dotfiles", "teste"]
    const HIDDEN_REPOS = [
        "LuisHenrique27",
        "lujsdevportfolio"
        // "exemplo-repo-oculto",
    ];
    // Quando true, exibe repositórios sem forks: repos.filter(r => !r.fork).length
    // em vez de public_repos da API. Mude para true quando quiser excluir forks.
    const EXCLUDE_FORKS_FROM_COUNT = false;

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
    };

    const writeStore = (key, value) => {
        try {
            localStorage.setItem(key, value);
        } catch {
            /* storage indisponível — apenas ignora */
        }
    };

    const storedTheme = readStore(THEME_KEY);
    if (storedTheme === "light" || storedTheme === "dark") {
        root.dataset.theme = storedTheme;
    }

    const syncThemeLabel = () => {
        if (!themeBtn) return;
        const isDark = root.dataset.theme !== "light";
        themeBtn.setAttribute(
            "aria-label",
            isDark ? "Mudar para tema claro" : "Mudar para tema escuro",
        );
    };

    syncThemeLabel();

    themeBtn?.addEventListener("click", () => {
        const next = root.dataset.theme === "light" ? "dark" : "light";
        root.dataset.theme = next;
        writeStore(THEME_KEY, next);
        syncThemeLabel();
    });

    /* ---------- Menu mobile ---------- */
    const navToggle = document.querySelector(".nav-toggle");
    const navMenu = document.getElementById("nav-menu");

    const closeMenu = () => {
        navMenu?.classList.remove("is-open");
        navToggle?.classList.remove("is-open");
        navToggle?.setAttribute("aria-expanded", "false");
        navToggle?.setAttribute("aria-label", "Abrir menu");
    };

    navToggle?.addEventListener("click", () => {
        const open = !navMenu?.classList.contains("is-open");
        navMenu?.classList.toggle("is-open", open);
        navToggle.classList.toggle("is-open", open);
        navToggle.setAttribute("aria-expanded", String(open));
        navToggle.setAttribute("aria-label", open ? "Fechar menu" : "Abrir menu");
    });

    navMenu?.querySelectorAll("a").forEach((link) => {
        link.addEventListener("click", closeMenu);
    });

    document.addEventListener("keydown", (event) => {
        if (event.key === "Escape") closeMenu();
    });

    /* ---------- Header com estado ao rolar ---------- */
    const header = document.querySelector(".site-header");

    const syncHeader = () => {
        header?.classList.toggle("is-scrolled", window.scrollY > 6);
    };

    window.addEventListener("scroll", syncHeader, { passive: true });
    syncHeader();

    /* ---------- Links ativos na navbar ---------- */
    const navLinks = [...document.querySelectorAll(".nav-links a")];
    const sections = [...document.querySelectorAll("main section[id]")];

    const setActiveLink = (id) => {
        navLinks.forEach((link) => {
            const match = link.getAttribute("href") === `#${id}`;
            if (match) {
                link.setAttribute("aria-current", "location");
            } else {
                link.removeAttribute("aria-current");
            }
        });
    };

    if ("IntersectionObserver" in window && sections.length) {
        const sectionObserver = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) setActiveLink(entry.target.id);
                });
            },
            { rootMargin: "-45% 0px -50% 0px", threshold: 0 },
        );

        sections.forEach((section) => sectionObserver.observe(section));
    }

    /* ---------- Reveal on scroll ---------- */
    const revealItems = [...document.querySelectorAll(".reveal")];

    if ("IntersectionObserver" in window) {
        const revealObserver = new IntersectionObserver(
            (entries, observer) => {
                entries.forEach((entry) => {
                    if (entry.isIntersecting) {
                        entry.target.classList.add("is-visible");
                        observer.unobserve(entry.target);
                    }
                });
            },
            { threshold: 0.12, rootMargin: "0px 0px -60px 0px" },
        );

        revealItems.forEach((item) => revealObserver.observe(item));
    } else {
        revealItems.forEach((item) => item.classList.add("is-visible"));
    }

    /* ---------- Animação do console (linha a linha) ---------- */
    const consoleEl = document.querySelector(".console");

    if (consoleEl) {
        consoleEl.querySelectorAll(".cline").forEach((line, index) => {
            line.style.setProperty("--i", String(index));
        });

        const runConsole = () => consoleEl.classList.add("run");

        if ("IntersectionObserver" in window) {
            const consoleObserver = new IntersectionObserver(
                (entries, observer) => {
                    entries.forEach((entry) => {
                        if (entry.isIntersecting) {
                            runConsole();
                            observer.unobserve(entry.target);
                        }
                    });
                },
                { threshold: 0.3 },
            );

            consoleObserver.observe(consoleEl);
        } else {
            runConsole();
        }
    }

    /* ---------- Ano do rodapé ---------- */
    const yearEl = document.getElementById("year");
    if (yearEl) yearEl.textContent = String(new Date().getFullYear());

    /* =====================================================
       GITHUB — Projetos ao vivo + Stats numerados
       API pública sem autenticação:
         https://api.github.com/users/{username}/repos
         https://api.github.com/users/{username}  (stats: public_repos, followers)
         https://api.github.com/search/commits?q=author:{username}&per_page=1  (total_count)
       Preview social:
         https://opengraph.githubassets.com/1/{full_name}
       Filtros ao vivo: busca, linguagem, estrelas, ordenar,
       mostrar ocultos. HIDDEN_REPOS no topo do script.
       Stats: cards numerados 01/02/03 com toLocaleString('pt-BR'),
              placeholder "–" durante carregamento, "N/A" se commits falhar.
       Máximo 2 requisições extras além da lista de repos (60 req/h).
       Sem dependências. Imagens com loading="lazy".
       ===================================================== */

    const ghGrid = document.getElementById("gh-grid");
    const ghFallback = document.getElementById("gh-fallback");
    const ghStatus = document.getElementById("gh-status");
    const ghCount = document.getElementById("gh-count");
    const ghSearch = document.getElementById("gh-search");
    const ghLang = document.getElementById("gh-lang");
    const ghStars = document.getElementById("gh-stars");
    const ghSort = document.getElementById("gh-sort");
    const ghToggleHidden = document.getElementById("gh-toggle-hidden");

    // Stats — #github (cards numerados 01 Repositórios / 02 Commits / 03 Seguidores)
    const ghStatsWrap = document.getElementById("gh-stats");
    const ghStatRepos = document.getElementById("gh-stat-repos");
    const ghStatCommits = document.getElementById("gh-stat-commits");
    const ghStatFollowers = document.getElementById("gh-stat-followers");

    // Só inicializa se a seção existe (evita erro em outras páginas)
    if (ghGrid && ghStatus) {
        let allRepos = [];
        let showHidden = false;
        let statsSeq = 0; // para evitar corrida quando o usuário troca de user rápido

        const escapeHtml = (str) =>
            String(str ?? "").replace(/[&<>"']/g, (c) => ({
                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                '"': "&quot;",
                "'": "&#39;",
            })[c]);

        const formatDate = (iso) => {
            try {
                return new Intl.DateTimeFormat("pt-BR", {
                    day: "2-digit",
                    month: "short",
                    year: "numeric",
                }).format(new Date(iso));
            } catch {
                return iso ? String(iso).slice(0, 10) : "—";
            }
        };

        const fmtBR = (n) => {
            const num = typeof n === "number" ? n : Number(n);
            if (!Number.isFinite(num)) return "–";
            return num.toLocaleString("pt-BR");
        };

        const isHidden = (repo) => HIDDEN_REPOS.includes(repo.name);

        const buildLangOptions = () => {
            if (!ghLang) return;
            const current = ghLang.value;
            const langs = [...new Set(allRepos.map((r) => r.language).filter(Boolean))].sort((a, b) =>
                a.localeCompare(b, "pt-BR"),
            );
            ghLang.innerHTML =
                `<option value="">Todas</option>` +
                langs.map((l) => `<option value="${escapeHtml(l)}">${escapeHtml(l)}</option>`).join("");
            if (current && [...ghLang.options].some((o) => o.value === current)) ghLang.value = current;
        };

        const getFiltered = () => {
            const q = (ghSearch?.value || "").trim().toLowerCase();
            const lang = ghLang?.value || "";
            const minStars = parseInt(ghStars?.value || "0", 10);
            const safeMin = Number.isFinite(minStars) && minStars > 0 ? minStars : 0;
            const sort = ghSort?.value || "updated";

            let list = allRepos.filter((repo) => {
                if (!showHidden && isHidden(repo)) return false;
                if (lang && repo.language !== lang) return false;
                if ((repo.stargazers_count || 0) < safeMin) return false;
                if (q) {
                    const hay = `${repo.name} ${repo.description || ""} ${repo.language || ""} ${repo.full_name} ${repo.topics ? repo.topics.join(" ") : ""}`.toLowerCase();
                    if (!hay.includes(q)) return false;
                }
                return true;
            });

            list.sort((a, b) => {
                if (sort === "stars") return (b.stargazers_count || 0) - (a.stargazers_count || 0);
                if (sort === "forks") return (b.forks_count || 0) - (a.forks_count || 0);
                if (sort === "name") return a.name.localeCompare(b.name, "pt-BR");
                // updated (padrão) — mais recente primeiro
                return new Date(b.updated_at) - new Date(a.updated_at);
            });

            return list;
        };

        const cardHtml = (repo) => {
            const hiddenFlag = isHidden(repo)
                ? `<span class="gh-card-hidden-flag">oculto</span>`
                : "";
            const forkFlag = repo.fork ? `<span class="gh-card-fork-flag">fork</span>` : "";
            const langBadge = repo.language
                ? `<span class="badge gh-lang-badge">${escapeHtml(repo.language)}</span>`
                : `<span class="badge" style="opacity:.55">— sem linguagem</span>`;
            const desc = repo.description
                ? escapeHtml(repo.description)
                : `<span style="color:var(--muted);font-style:italic">Sem descrição.</span>`;
            const stars = repo.stargazers_count ?? 0;
            const forks = repo.forks_count ?? 0;
            const updated = formatDate(repo.updated_at);
            const fullName = escapeHtml(repo.full_name);
            const name = escapeHtml(repo.name);
            const htmlUrl = escapeHtml(repo.html_url);
            const ogUrl = `https://opengraph.githubassets.com/1/${encodeURIComponent(repo.owner.login)}/${encodeURIComponent(repo.name)}`;

            return `
      <article class="project-card gh-card">
        <a class="gh-card-media" href="${htmlUrl}" target="_blank" rel="noopener" aria-label="Abrir ${fullName} no GitHub">
          <img
            src="${ogUrl}"
            alt="Preview do repositório ${fullName}"
            loading="lazy"
            decoding="async"
            width="640"
            height="320"
            onerror="this.style.display='none';this.nextElementSibling.style.display='flex';"
          />
          <span class="gh-card-media--fallback" style="display:none;position:absolute;inset:0;align-items:center;justify-content:center;padding:16px;text-align:center;background:repeating-linear-gradient(45deg,#0a0a0b 0 2px,#17171b 2px 16px);color:#6b6b74;font-family:var(--font-mono);font-size:.72rem;font-weight:700;letter-spacing:.12em;text-transform:uppercase;">${name}</span>
          ${hiddenFlag}
          ${forkFlag}
        </a>
        <div class="project-body gh-card-body">
          <div class="gh-card-head">
            ${langBadge}
            ${repo.fork ? `<span class="badge" style="border-color:var(--line-soft);color:var(--muted)">fork</span>` : ""}
            ${repo.archived ? `<span class="badge" style="border-color:#ff4d4d;color:#ff4d4d">arquivado</span>` : ""}
          </div>
          <h3><a href="${htmlUrl}" target="_blank" rel="noopener">${name}</a></h3>
          <p class="gh-card-desc">${desc}</p>
          <div class="gh-card-meta" aria-label="Metadados do repositório">
            <span title="Estrelas">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><path d="M12 3l2.2 5.2 5.6.5-4.2 3.7.9 5.6L12 15.2 7.5 18l.9-5.6L4.2 8.7l5.6-.5z"/></svg>
              ${stars}
            </span>
            <span title="Forks">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><circle cx="6" cy="5" r="2.2"/><circle cx="6" cy="19" r="2.2"/><circle cx="18" cy="9" r="2.2"/><path d="M6 7.2v9.6M8.2 9H14a4 4 0 0 1 4 4v-.6"/></svg>
              ${forks}
            </span>
            <span title="Atualizado em ${escapeHtml(repo.updated_at)}">
              <svg viewBox="0 0 24 24" width="14" height="14" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="square" aria-hidden="true"><circle cx="12" cy="12" r="8"/><path d="M12 8v4l3 2"/></svg>
              ${updated}
            </span>
            <span style="margin-left:auto;opacity:.65;font-size:.7rem;max-width:100%;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${fullName}</span>
          </div>
          <div class="gh-card-actions">
            <a class="btn btn-small btn-ghost" href="${htmlUrl}" target="_blank" rel="noopener">Ver no GitHub <span class="arrow" aria-hidden="true">→</span></a>
            ${repo.homepage ? `<a class="btn btn-small btn-primary" href="${escapeHtml(repo.homepage)}" target="_blank" rel="noopener">Demo <span class="arrow" aria-hidden="true">↗</span></a>` : ""}
          </div>
        </div>
      </article>`;
        };

        const render = () => {
            const filtered = getFiltered();
            const total = allRepos.length;
            const hiddenCount = allRepos.filter(isHidden).length;
            const visibleTotal = total - (showHidden ? 0 : hiddenCount);
            const shown = filtered.length;

            if (ghCount) {
                if (!total) {
                    ghCount.textContent = "";
                } else {
                    const base = showHidden ? `${shown} / ${total}` : `${shown} de ${visibleTotal}`;
                    const extra = hiddenCount && showHidden ? ` · ${hiddenCount} oculto(s)` : hiddenCount && !showHidden ? ` · ${hiddenCount} oculto(s) filtrados` : "";
                    ghCount.textContent = `${base} repositórios${extra}`;
                }
            }

            if (!total) {
                // sem repos — já tratado, limpa status se necessário
                return;
            }

            if (!shown) {
                if (ghStatus) {
                    ghStatus.innerHTML = `Nenhum repositório corresponde aos filtros.`;
                }
                ghGrid.setAttribute("aria-busy", "false");
                ghGrid.innerHTML = `
          <div class="gh-empty">
            <h3>Nada por aqui.</h3>
            <p>Tente ajustar busca, linguagem ou estrelas mínimas. Use “Mostrar ocultos” para ver repos filtrados por <code style="font-family:var(--font-mono);background:var(--surface-2);padding:2px 6px;border:1px solid var(--line-soft)">HIDDEN_REPOS</code>.</p>
            <button class="btn btn-small btn-ghost" type="button" id="gh-clear-filters">Limpar filtros <span class="arrow" aria-hidden="true">↺</span></button>
          </div>`;
                document.getElementById("gh-clear-filters")?.addEventListener("click", () => {
                    if (ghSearch) ghSearch.value = "";
                    if (ghLang) ghLang.value = "";
                    if (ghStars) ghStars.value = "";
                    if (ghSort) ghSort.value = "updated";
                    render();
                });
                return;
            }

            if (ghStatus) {
                ghStatus.textContent = showHidden
                    ? `Exibindo ${shown} repositório(s) — incluindo ocultos.`
                    : `Exibindo ${shown} repositório(s).`;
            }

            ghGrid.setAttribute("aria-busy", "false");
            ghGrid.innerHTML = filtered.map(cardHtml).join("");
        };

        const setLoading = (isLoading, message) => {
            ghGrid.setAttribute("aria-busy", String(isLoading));
            if (isLoading) {
                ghGrid.hidden = false;
                if (ghFallback) ghFallback.hidden = true;
                ghGrid.innerHTML = `
          <article class="project-card gh-skeleton" aria-hidden="true"><div class="gh-skel-media"></div><div class="gh-skel-body"><span></span><span></span><span></span></div></article>
          <article class="project-card gh-skeleton" aria-hidden="true"><div class="gh-skel-media"></div><div class="gh-skel-body"><span></span><span></span><span></span></div></article>
          <article class="project-card gh-skeleton" aria-hidden="true"><div class="gh-skel-media"></div><div class="gh-skel-body"><span></span><span></span><span></span></div></article>
        `;
                if (ghStatus) ghStatus.textContent = message || "Carregando repositórios…";
                if (ghCount) ghCount.textContent = "";
            }
        };

        /* ---------- Stats: repositórios / commits / seguidores (max 2 req extras) ---------- */
        const setStatsLoading = () => {
            if (ghStatRepos) ghStatRepos.textContent = "–";
            if (ghStatCommits) ghStatCommits.textContent = "–";
            if (ghStatFollowers) ghStatFollowers.textContent = "–";
            if (ghStatsWrap) ghStatsWrap.setAttribute("aria-busy", "true");
        };

        const fetchGithubStats = async (username, seq) => {
            const user = (username || "").trim();
            if (!user) return;
            setStatsLoading();
            // Máximo 2 requisições extras além da lista de repos (60 req/h)
            const userUrl = `https://api.github.com/users/${encodeURIComponent(user)}`;
            const commitsUrl = `https://api.github.com/search/commits?q=author:${encodeURIComponent(user)}&per_page=1`;

            const userPromise = fetch(userUrl, {
                headers: { Accept: "application/vnd.github.v3+json" },
            });
            const commitsPromise = fetch(commitsUrl, {
                headers: { Accept: "application/vnd.github.cloak-preview+json" },
            });

            try {
                const [userRes, commitsRes] = await Promise.all([userPromise, commitsPromise]);
                if (seq !== statsSeq) return; // descarta resposta obsoleta

                // --- public_repos & followers (de /users) ---
                if (userRes.ok) {
                    const data = await userRes.json();
                    if (seq !== statsSeq) return;
                    if (ghStatFollowers) ghStatFollowers.textContent = fmtBR(data.followers);
                    if (ghStatRepos) {
                        if (EXCLUDE_FORKS_FROM_COUNT && allRepos.length) {
                            const reposSemFork = allRepos.filter((r) => !r.fork).length;
                            ghStatRepos.textContent = fmtBR(reposSemFork);
                        } else {
                            ghStatRepos.textContent = fmtBR(data.public_repos);
                        }
                    }
                } else {
                    // placeholder "–" durante carga; em falha mantém "–" (N/A só para commits, conforme spec)
                    if (ghStatRepos) ghStatRepos.textContent = "–";
                    if (ghStatFollowers) ghStatFollowers.textContent = "–";
                    console.warn("[GitHub stats] user fetch failed:", userRes.status);
                    try {
                        const j = await userRes.json();
                        if (j && j.message) console.warn("[GitHub stats] user message:", j.message);
                    } catch { /* ignore */ }
                }

                // --- total de commits (search/commits total_count) ---
                if (commitsRes.ok) {
                    const cdata = await commitsRes.json();
                    if (seq !== statsSeq) return;
                    const total = typeof cdata.total_count === "number" ? cdata.total_count : 0;
                    if (ghStatCommits) ghStatCommits.textContent = fmtBR(total);
                } else {
                    if (seq !== statsSeq) return;
                    if (ghStatCommits) ghStatCommits.textContent = "N/A";
                    console.warn("[GitHub stats] commits fetch failed:", commitsRes.status);
                }
            } catch (err) {
                if (seq !== statsSeq) return;
                // Falha de rede: commits vira N/A (conforme spec), repos/followers mantém "–"
                if (ghStatCommits && ghStatCommits.textContent === "–") ghStatCommits.textContent = "N/A";
                console.warn("[GitHub stats] network error:", err);
            } finally {
                if (seq === statsSeq && ghStatsWrap) ghStatsWrap.setAttribute("aria-busy", "false");
            }
        };

        const fetchRepos = async (username) => {
            const user = (username || "").trim();
            if (!user) {
                if (ghStatus) ghStatus.innerHTML = `<span class="gh-status gh-status--error">Informe um usuário do GitHub.</span>`;
                return;
            }
            const mySeq = ++statsSeq;
            setLoading(true, `Buscando repos de @${user}…`);
            setStatsLoading();
            // Dispara stats em paralelo para não estourar tempo, mas ainda são só 2 req extras
            const statsPromise = fetchGithubStats(user, mySeq);
            try {
                const url = `https://api.github.com/users/${encodeURIComponent(user)}/repos?per_page=100&sort=updated`;
                const res = await fetch(url, {
                    headers: { Accept: "application/vnd.github.v3+json" },
                });

                if (!res.ok) {
                    let msg = `Erro ${res.status}`;
                    if (res.status === 404) msg = `Usuário “${user}” não encontrado.`;
                    else if (res.status === 403) {
                        const remaining = res.headers.get("x-ratelimit-remaining");
                        if (remaining === "0") {
                            msg = `Limite da API do GitHub atingido (60 req/h sem autenticação). Tente novamente em alguns minutos.`;
                        } else {
                            msg = `Acesso negado pela API (403).`;
                        }
                    } else {
                        try {
                            const j = await res.json();
                            if (j && j.message) msg = j.message;
                        } catch {
                            /* ignore */
                        }
                    }
                    throw new Error(msg);
                }

                const data = await res.json();
                if (!Array.isArray(data)) throw new Error("Resposta inesperada da API.");

                allRepos = data;
                buildLangOptions();

                if (!allRepos.length) {
                    if (ghStatus) ghStatus.innerHTML = `<span class="gh-status--error" style="display:inline-block">Nenhum repositório público encontrado para @${escapeHtml(user)}.</span>`;
                    if (ghCount) ghCount.textContent = "0 repositórios";
                    ghGrid.setAttribute("aria-busy", "false");
                    ghGrid.innerHTML = `
            <div class="gh-empty">
              <h3>Sem repos públicos.</h3>
              <p>O usuário @${escapeHtml(user)} não tem repositórios públicos.</p>
            </div>`;
                    // stats já está em loading; aguarda statsPromise resolver para preencher followers/commits
                    await statsPromise;
                    return;
                }

                // Atualiza links da seção GitHub opcionalmente
                const islandLink = document.querySelector("#github .btn-island");
                if (islandLink) islandLink.setAttribute("href", `https://github.com/${encodeURIComponent(user)}`);
                const islandUser = document.querySelector(".gh-user");
                if (islandUser) islandUser.textContent = `github.com/${user}`;

                render();
                await statsPromise;
                // Se EXCLUDE_FORKS_FROM_COUNT=true, corrige contagem após repos carregados
                if (EXCLUDE_FORKS_FROM_COUNT && ghStatRepos) {
                    const reposSemFork = allRepos.filter((r) => !r.fork).length;
                    ghStatRepos.textContent = fmtBR(reposSemFork);
                }
            } catch (err) {
                const message = err instanceof Error ? err.message : String(err);
                if (ghStatus) {
                    ghStatus.innerHTML = `<span class="gh-status gh-status--error">Falha ao carregar: ${escapeHtml(message)} — mostrando projetos em destaque abaixo.</span>`;
                }
                if (ghCount) ghCount.textContent = "fallback";
                ghGrid.hidden = true;
                if (ghFallback) {
                    ghFallback.hidden = false;
                    ghFallback.setAttribute("aria-busy", "false");
                }
                // Em erro de repos, stats ainda tenta preencher; se falhar, já mostra "–"/"N/A"
                try { await statsPromise; } catch { /* ignore */ }
                console.warn("[GitHub] fetch failed:", message);
            }
        };

        /* ---------- Eventos — filtros ao vivo ---------- */
        ghSearch?.addEventListener("input", render);
        ghLang?.addEventListener("change", render);
        ghStars?.addEventListener("input", render);
        ghSort?.addEventListener("change", render);

        ghToggleHidden?.addEventListener("click", () => {
            showHidden = !showHidden;
            ghToggleHidden.setAttribute("aria-pressed", String(showHidden));
            const txt = ghToggleHidden.querySelector(".gh-toggle-text");
            if (txt) txt.textContent = showHidden ? "Ocultando ocultos" : "Mostrar ocultos";
            render();
        });

        fetchRepos(GITHUB_USERNAME_DEFAULT);

        // Expor para debug / edição rápida no console
        // window.HIDDEN_REPOS = HIDDEN_REPOS; // descomente se quiser inspecionar
    }
})();