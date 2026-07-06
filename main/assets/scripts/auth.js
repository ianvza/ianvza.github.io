

(function () {
    const sessionKey = 'linedup_user';
    let pendingVerificationEmail = '';

    function getCurrentUser() {
        try {
            return JSON.parse(sessionStorage.getItem(sessionKey) || 'null');
        } catch {
            return null;
        }
    }

    function setCurrentUser(user) {
        if (user) sessionStorage.setItem(sessionKey, JSON.stringify(user));
        else sessionStorage.removeItem(sessionKey);
        syncAuthChrome();
        window.LinedUpCrosshairs?.render?.();
        if (document.getElementById('lineups-app')) window.initLineupsPage?.();
    }

    function requireLogin(message = 'Entre com uma conta para usar esta funcao.') {
        if (getCurrentUser()) return true;
        showToast(message);
        openLogin();
        return false;
    }

    async function apiRequest(url, options = {}) {
        const user = getCurrentUser();
        const response = await fetch(url, {
            ...options,
            headers: {
                'Content-Type': 'application/json',
                ...(user ? { 'X-LinedUp-User-Id': user.id } : {}),
                ...(options.headers || {})
            }
        });
        const data = await response.json().catch(() => ({}));
        if (!response.ok) throw new Error(data.error || `Erro ${response.status}`);
        return data;
    }

    function ensureAuthModal() {
        if (document.getElementById('auth-modal')) return;
        document.body.insertAdjacentHTML('beforeend', `
            <div id="auth-modal" class="modal-overlay account-modal-overlay" style="display:none" onclick="LinedUpAuth.closeLogin(event)">
                <div class="modal account-modal" onclick="event.stopPropagation()">
                    <div class="modal-header">
                        <div>
                            <span class="modal-kicker">Conta</span>
                            <h3>Entrar no LinedUp</h3>
                        </div>
                        <button class="modal-close" type="button" onclick="LinedUpAuth.closeLogin()">
                            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                                <line x1="18" y1="6" x2="6" y2="18" />
                                <line x1="6" y1="6" x2="18" y2="18" />
                            </svg>
                        </button>
                    </div>
                    <div class="auth-tabs">
                        <button class="auth-tab active" type="button" data-auth-tab="login">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                                <path d="M10 17l5-5-5-5" />
                                <path d="M15 12H3" />
                            </svg>
                            Login
                        </button>
                        <button class="auth-tab" type="button" data-auth-tab="register">
                            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                                stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                <circle cx="9" cy="7" r="4" />
                                <path d="M19 8v6" />
                                <path d="M22 11h-6" />
                            </svg>
                            Cadastrar
                        </button>
                    </div>
                    <div class="modal-body">
                        <form class="auth-panel" id="login-form">
                            <div class="form-group">
                                <label>Login ou email</label>
                                <input type="text" id="login-username" autocomplete="username" placeholder="user ou user@tantofaz.com" />
                            </div>
                            <div class="form-group">
                                <label>Senha</label>
                                <input type="password" id="login-password" autocomplete="current-password" placeholder="Digite sua senha" />
                            </div>
                            <button class="btn btn-primary" type="submit">Entrar</button>
                        </form>
                        <form class="auth-panel" id="register-form" hidden>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Login</label>
                                    <input type="text" id="register-login" autocomplete="username" placeholder="seu login" />
                                </div>
                                <div class="form-group">
                                    <label>Email</label>
                                    <input type="email" id="register-email" autocomplete="email" placeholder="email@exemplo.com" />
                                </div>
                            </div>
                            <div class="form-row">
                                <div class="form-group">
                                    <label>Senha</label>
                                    <input type="password" id="register-password" autocomplete="new-password" placeholder="Crie uma senha" />
                                </div>
                                <div class="form-group">
                                    <label>Confirmar senha</label>
                                    <input type="password" id="register-password-2" autocomplete="new-password" placeholder="Repita a senha" />
                                </div>
                            </div>
                            <button class="btn btn-primary" type="submit">Criar conta</button>
                        </form>
                        <form class="auth-panel" id="verify-form" hidden>
                            <div class="form-group">
                                <label>Codigo de verificacao</label>
                                <input type="text" id="verify-code" inputmode="numeric" autocomplete="one-time-code" maxlength="6" placeholder="000000" />
                            </div>
                            <button class="btn btn-primary" type="submit">Confirmar email</button>
                            <button class="btn btn-ghost" id="resend-code-btn" type="button">Reenviar codigo</button>
                        </form>
                    </div>
                </div>
            </div>
        `);
    }

    function setAuthTab(tab) {
        document.querySelectorAll('.auth-tab').forEach(button => {
            button.classList.toggle('active', button.dataset.authTab === tab);
        });
        document.getElementById('login-form')?.toggleAttribute('hidden', tab !== 'login');
        document.getElementById('register-form')?.toggleAttribute('hidden', tab !== 'register');
        document.getElementById('verify-form')?.toggleAttribute('hidden', tab !== 'verify');
    }

    function openLogin(tab = 'login') {
        ensureAuthModal();
        setAuthTab(tab);
        const modal = document.getElementById('auth-modal');
        if (modal) modal.style.display = 'flex';
    }

    function closeLogin(event) {
        if (event && event.target !== document.getElementById('auth-modal')) return;
        const modal = document.getElementById('auth-modal');
        if (modal) modal.style.display = 'none';
    }

    async function processLogin(event) {
        event.preventDefault();
        const login = document.getElementById('login-username')?.value.trim();
        const senha = document.getElementById('login-password')?.value.trim();
        if (!login || !senha) {
            showToast('Informe login e senha.');
            return;
        }

        try {
            const data = await apiRequest('/api/auth/login', {
                method: 'POST',
                body: JSON.stringify({ login, senha })
            });
            setCurrentUser(data.user);
            closeLogin();
            showToast(`Login feito como ${data.user.login}.`);
            if (document.getElementById('users-admin-page')) initAdminUsersPage();
        } catch (error) {
            showToast(error.message || 'Login invalido.');
        }
    }

    async function processRegister(event) {
        event.preventDefault();
        const login = document.getElementById('register-login')?.value.trim();
        const email = document.getElementById('register-email')?.value.trim();
        const senha = document.getElementById('register-password')?.value.trim();
        const senha2 = document.getElementById('register-password-2')?.value.trim();
        if (!login || !email || !senha) {
            showToast('Preencha login, email e senha.');
            return;
        }
        if (senha !== senha2) {
            showToast('As senhas nao conferem.');
            return;
        }

        try {
            const data = await apiRequest('/api/auth/register', {
                method: 'POST',
                body: JSON.stringify({ login, email, senha })
            });
            pendingVerificationEmail = data.email || email;
            document.getElementById('register-form')?.reset();
            setAuthTab('verify');
            showToast(data.message || 'Digite o codigo enviado para seu email.', 6000);
        } catch (error) {
            showToast(error.message || 'Erro ao criar conta.');
        }
    }

    async function processVerification(event) {
        event.preventDefault();
        const code = document.getElementById('verify-code')?.value.trim();
        if (!pendingVerificationEmail || !code) {
            showToast('Informe o codigo recebido por email.');
            return;
        }

        try {
            const data = await apiRequest('/api/auth/verify-code', {
                method: 'POST',
                body: JSON.stringify({ email: pendingVerificationEmail, code })
            });
            pendingVerificationEmail = '';
            document.getElementById('verify-form')?.reset();
            setCurrentUser(data.user);
            closeLogin();
            showToast(data.message || `Login feito como ${data.user.login}.`);
        } catch (error) {
            showToast(error.message || 'Erro ao confirmar email.');
        }
    }

    async function resendVerificationCode() {
        if (!pendingVerificationEmail) {
            showToast('Faca o cadastro novamente para reenviar o codigo.');
            setAuthTab('register');
            return;
        }

        try {
            const data = await apiRequest('/api/auth/resend-code', {
                method: 'POST',
                body: JSON.stringify({ email: pendingVerificationEmail })
            });
            showToast(data.message || 'Codigo reenviado.');
        } catch (error) {
            showToast(error.message || 'Erro ao reenviar codigo.');
        }
    }

    function logout() {
        setCurrentUser(null);
        showToast('Logout realizado.');
        if (document.getElementById('users-admin-page')) {
            location.href = 'index.html';
        }
    }

    function syncAuthChrome() {
        const user = getCurrentUser();
        document.querySelectorAll('.navbar-links').forEach(element => {
            element.classList.toggle('is-logged', Boolean(user));
            element.classList.toggle('is-admin', user?.type === 'admin');
        });
        document.querySelectorAll('.navbar-auth').forEach(element => {
            element.classList.toggle('is-logged', Boolean(user));
        });
        document.querySelectorAll('[data-auth-only]').forEach(element => {
            element.hidden = !user;
        });
        document.querySelectorAll('[data-admin-only]').forEach(element => {
            element.hidden = user?.type !== 'admin';
        });

        const label = document.getElementById('session-user-label');
        if (label) label.textContent = user ? user.login : '';

        const button = document.getElementById('auth-menu-btn');
        if (button) {
            button.innerHTML = user
                ? `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" />
                        <path d="M16 17l5-5-5-5" />
                        <path d="M21 12H9" />
                    </svg>
                    Deslogar`
                : `<svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor"
                        stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                        <path d="M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4" />
                        <path d="M10 17l5-5-5-5" />
                        <path d="M15 12H3" />
                    </svg>
                    Login`;
            button.dataset.authAction = user ? 'logout' : 'login';
        }
        const registerButton = document.getElementById('register-menu-btn');
        if (registerButton) registerButton.hidden = Boolean(user);

        window.LinedUpLineups?.syncAdminControls?.();
    }

    async function updateFavorite(crosshairId, favorite) {
        const data = await apiRequest('/api/favorites', {
            method: 'POST',
            body: JSON.stringify({ crosshairId, favorite })
        });
        setCurrentUser(data.user);
        return data.user;
    }

    async function initAdminUsersPage() {
        const root = document.getElementById('users-admin-page');
        if (!root) return;
        const user = getCurrentUser();
        const content = document.getElementById('admin-users-content');
        if (!user || user.type !== 'admin') {
            if (content) content.innerHTML = '<div class="state-box"><p>Entre como administrador para acessar este CRUD.</p></div>';
            return;
        }

        const form = document.getElementById('admin-user-form');
        if (form && form.dataset.bound !== 'true') {
            form.dataset.bound = 'true';
            form.addEventListener('submit', createAdminUser);
        }
        await renderAdminUsers();
    }

    async function renderAdminUsers() {
        const content = document.getElementById('admin-users-content');
        if (!content) return;
        try {
            const data = await apiRequest('/api/users');
            content.innerHTML = data.users.map(user => `
                <div class="admin-user-row" data-user-id="${user.id}">
                    <input type="text" value="${escapeHtml(user.login)}" data-field="login" />
                    <input type="email" value="${escapeHtml(user.email)}" data-field="email" />
                    <input type="text" value="${escapeHtml(user.senha)}" data-field="senha" />
                    <select data-field="type">
                        <option value="normal"${user.type === 'normal' ? ' selected' : ''}>Normal</option>
                        <option value="admin"${user.type === 'admin' ? ' selected' : ''}>Admin</option>
                    </select>
                    <div class="admin-actions">
                        <button class="btn btn-ghost" type="button" onclick="LinedUpAuth.saveAdminUser(${user.id})">Salvar</button>
                        <button class="btn btn-ghost" type="button" onclick="LinedUpAuth.deleteAdminUser(${user.id})">Excluir</button>
                    </div>
                </div>
            `).join('');
        } catch (error) {
            content.innerHTML = `<div class="state-box"><p>${escapeHtml(error.message)}</p></div>`;
        }
    }

    async function createAdminUser(event) {
        event.preventDefault();
        const payload = {
            login: document.getElementById('admin-login')?.value.trim(),
            email: document.getElementById('admin-email')?.value.trim(),
            senha: document.getElementById('admin-senha')?.value.trim(),
            type: document.getElementById('admin-type')?.value || 'normal'
        };
        try {
            await apiRequest('/api/users', { method: 'POST', body: JSON.stringify(payload) });
            event.target.reset();
            showToast('Usuario criado.');
            await renderAdminUsers();
        } catch (error) {
            showToast(error.message || 'Erro ao criar usuario.');
        }
    }

    async function saveAdminUser(id) {
        const row = document.querySelector(`.admin-user-row[data-user-id="${id}"]`);
        if (!row) return;
        const payload = {};
        row.querySelectorAll('[data-field]').forEach(input => {
            payload[input.dataset.field] = input.value.trim();
        });
        try {
            await apiRequest(`/api/users/${id}`, { method: 'PUT', body: JSON.stringify(payload) });
            showToast('Usuario atualizado.');
            await renderAdminUsers();
        } catch (error) {
            showToast(error.message || 'Erro ao salvar usuario.');
        }
    }

    async function deleteAdminUser(id) {
        try {
            await apiRequest(`/api/users/${id}`, { method: 'DELETE' });
            showToast('Usuario excluido.');
            await renderAdminUsers();
        } catch (error) {
            showToast(error.message || 'Erro ao excluir usuario.');
        }
    }

    function initAuthUi() {
        ensureAuthModal();
        syncAuthChrome();
        showVerificationToast();

        document.querySelectorAll('.auth-tab').forEach(button => {
            button.onclick = () => setAuthTab(button.dataset.authTab || 'login');
        });
        const loginForm = document.getElementById('login-form');
        if (loginForm && loginForm.dataset.bound !== 'true') {
            loginForm.dataset.bound = 'true';
            loginForm.addEventListener('submit', processLogin);
        }
        const registerForm = document.getElementById('register-form');
        if (registerForm && registerForm.dataset.bound !== 'true') {
            registerForm.dataset.bound = 'true';
            registerForm.addEventListener('submit', processRegister);
        }
        const verifyForm = document.getElementById('verify-form');
        if (verifyForm && verifyForm.dataset.bound !== 'true') {
            verifyForm.dataset.bound = 'true';
            verifyForm.addEventListener('submit', processVerification);
        }
        const resendButton = document.getElementById('resend-code-btn');
        if (resendButton && resendButton.dataset.bound !== 'true') {
            resendButton.dataset.bound = 'true';
            resendButton.addEventListener('click', resendVerificationCode);
        }
        const menuButton = document.getElementById('auth-menu-btn');
        if (menuButton && menuButton.dataset.bound !== 'true') {
            menuButton.dataset.bound = 'true';
            menuButton.addEventListener('click', () => {
                const user = getCurrentUser();
                if (user) logout();
                else openLogin();
            });
        }
        const registerButton = document.getElementById('register-menu-btn');
        if (registerButton && registerButton.dataset.bound !== 'true') {
            registerButton.dataset.bound = 'true';
            registerButton.addEventListener('click', () => openLogin('register'));
        }
        initAdminUsersPage();
    }

    function showVerificationToast() {
        const params = new URLSearchParams(location.search);
        const verified = params.get('verified');
        if (!verified || sessionStorage.getItem('linedup_verification_toast') === verified) return;

        sessionStorage.setItem('linedup_verification_toast', verified);
        if (verified === '1') {
            showToast('Email confirmado. Agora voce ja pode entrar.');
        } else if (verified === 'invalid') {
            showToast('Link de confirmacao invalido ou expirado.');
        }

        params.delete('verified');
        const query = params.toString();
        history.replaceState(history.state, '', `${location.pathname}${query ? `?${query}` : ''}${location.hash}`);
    }

    window.LinedUpAuth = {
        getCurrentUser,
        requireLogin,
        openLogin,
        closeLogin,
        updateFavorite,
        initAuthUi,
        initAdminUsersPage,
        saveAdminUser,
        deleteAdminUser
    };

    document.addEventListener('DOMContentLoaded', initAuthUi);
})();
