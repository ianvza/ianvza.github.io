(function () {
    async function swapPage(href, push = true) {
        const currentMain = document.querySelector('main.page');
        if (!currentMain) {
            window.location.href = href;
            return;
        }

        const previousMinHeight = currentMain.style.minHeight;
        currentMain.style.minHeight = `${currentMain.offsetHeight}px`;
        currentMain.classList.add('is-swapping');
        window.scrollTo({ top: 0, left: 0, behavior: 'auto' });

        try {
            const response = await fetch(href, { headers: { 'X-Requested-With': 'fetch' } });
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            const html = await response.text();
            const doc = new DOMParser().parseFromString(html, 'text/html');
            const nextMain = doc.querySelector('main.page');
            if (!nextMain) throw new Error('Conteudo nao encontrado');

            currentMain.innerHTML = nextMain.innerHTML;
            currentMain.className = nextMain.className;
            syncAuxiliaryElement(doc, 'crosshair-modal');
            syncAuxiliaryElement(doc, 'toast-container', true);
            currentMain.classList.remove('is-swapping');
            currentMain.style.minHeight = previousMinHeight;
            syncPageChrome();

            document.title = doc.title;
            updateActiveNav(href);
            if (push) history.pushState({ href }, '', href);
            initCurrentPage();
        } catch (error) {
            currentMain.style.minHeight = previousMinHeight;
            console.error(error);
            window.location.href = href;
        }
    }

    function syncAuxiliaryElement(doc, id, keepExisting = false) {
        const current = document.getElementById(id);
        const next = doc.getElementById(id);

        if (!next) {
            if (!keepExisting && current) current.remove();
            return;
        }

        if (current) {
            current.replaceWith(next.cloneNode(true));
        } else {
            document.body.appendChild(next.cloneNode(true));
        }
    }

    function updateActiveNav(href) {
        const route = href.includes('users')
            ? 'users'
            : href.includes('lineups')
                ? 'lineups'
                : href.includes('#favorites')
                    ? 'favorites'
                    : 'home';
        document.querySelectorAll('.navbar-link').forEach(link => {
            const isActive = link.dataset.route === route;
            link.classList.toggle('active', isActive);
        });
    }

    function initCurrentPage() {
        syncPageChrome();
        if (typeof LinedUpAuth !== 'undefined') LinedUpAuth.initAuthUi();
        if (typeof initTrackerPage === 'function') initTrackerPage();
        if (typeof initLineupsPage === 'function') initLineupsPage();
        if (document.getElementById('crosshairs-grid') && typeof loadCrosshairs === 'function') {
            loadCrosshairs();
        }
    }

    function syncPageChrome() {
        document.documentElement.classList.toggle('is-lineups', Boolean(document.querySelector('.lineups-page')));
    }

    document.addEventListener('click', event => {
        const link = event.target.closest('a[data-route]');
        if (!link) return;
        const href = link.getAttribute('href');
        if (!href || href.startsWith('http')) return;
        event.preventDefault();
        if (link.classList.contains('active')) return;
        swapPage(href);
    });

    window.addEventListener('popstate', () => {
        const href = `${location.pathname.split('/').pop() || 'index.html'}${location.hash || ''}`;
        swapPage(href, false);
    });

    document.addEventListener('DOMContentLoaded', initCurrentPage);
})();
