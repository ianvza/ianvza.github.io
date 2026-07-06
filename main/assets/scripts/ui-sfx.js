
(function () {
    let audioContext = null;
    let enabled = false;
    let lastMove = 0;
    let lastZoom = 0;
    let lastHoverTarget = null;

    function context() {
        if (!audioContext) {
            audioContext = new (window.AudioContext || window.webkitAudioContext)();
        }
        if (audioContext.state === 'suspended') audioContext.resume();
        return audioContext;
    }

    function activate() {
        enabled = true;
        context();
    }

    function tone(freq, duration, type, gainValue, detune = 0) {
        if (!enabled) return;
        const ctx = context();
        const now = ctx.currentTime;
        const osc = ctx.createOscillator();
        const gain = ctx.createGain();
        const filter = ctx.createBiquadFilter();

        osc.type = type;
        osc.frequency.setValueAtTime(freq, now);
        osc.detune.setValueAtTime(detune, now);
        filter.type = 'highpass';
        filter.frequency.setValueAtTime(420, now);
        gain.gain.setValueAtTime(0.0001, now);
        gain.gain.exponentialRampToValueAtTime(gainValue, now + 0.008);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

        osc.connect(filter);
        filter.connect(gain);
        gain.connect(ctx.destination);
        osc.start(now);
        osc.stop(now + duration + 0.02);
    }

    function hoverSound() {
        tone(740, 0.055, 'triangle', 0.018, -8);
    }

    function moveSound() {
        tone(520, 0.032, 'sine', 0.007, 12);
    }

    function clickSound() {
        tone(340, 0.045, 'triangle', 0.025, 0);
        setTimeout(() => tone(620, 0.06, 'triangle', 0.018, 0), 34);
    }

    function zoomTick(direction = 1) {
        activate();
        const now = performance.now();
        if (now - lastZoom < 55) return;
        lastZoom = now;
        tone(direction > 0 ? 760 : 520, 0.035, 'square', 0.018, 0);
        setTimeout(() => tone(direction > 0 ? 980 : 420, 0.028, 'triangle', 0.01, 0), 22);
    }

    function headerFrom(target) {
        return target.closest('.navbar-link, .brand-link, .auth-btn');
    }

    function interactiveFrom(target) {
        return target.closest('a, button, input, select, .crosshair-card, .map-card-placeholder, .card');
    }

    document.addEventListener('pointerdown', event => {
        activate();
        if (interactiveFrom(event.target)) clickSound();
    }, { passive: true });

    document.addEventListener('pointerover', event => {
        const target = headerFrom(event.target);
        if (!target || target === lastHoverTarget) return;
        lastHoverTarget = target;
        hoverSound();
    }, { passive: true });

    document.addEventListener('pointermove', event => {
        const target = headerFrom(event.target);
        if (!target) return;
        const now = performance.now();
        if (now - lastMove < 160) return;
        lastMove = now;
        moveSound();
    }, { passive: true });

    window.valtrackSfx = {
        zoomTick,
        clickSound
    };
})();
