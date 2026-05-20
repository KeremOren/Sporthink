// ═══ Sporthink Cinematic Animation Engine ═══
const cursor = document.getElementById('cursor');
const scenes = document.querySelectorAll('.scene');

// Create floating particles
const particleContainer = document.getElementById('particles');
for (let i = 0; i < 20; i++) {
    const p = document.createElement('div');
    p.className = 'particle';
    p.style.left = Math.random() * 100 + '%';
    p.style.top = Math.random() * 100 + '%';
    p.style.animationDelay = Math.random() * 8 + 's';
    p.style.animationDuration = (6 + Math.random() * 6) + 's';
    particleContainer.appendChild(p);
}

// Cursor animation
function moveCursor(x, y) {
    return new Promise(resolve => {
        cursor.style.left = x + 'px';
        cursor.style.top = y + 'px';
        setTimeout(resolve, 900);
    });
}

function clickCursor() {
    return new Promise(resolve => {
        cursor.classList.add('click');
        setTimeout(() => { cursor.classList.remove('click'); resolve(); }, 400);
    });
}

// Scene transitions
function showScene(id) {
    return new Promise(resolve => {
        scenes.forEach(s => s.classList.remove('active'));
        setTimeout(() => {
            document.getElementById(id).classList.add('active');
            setTimeout(resolve, 800);
        }, 300);
    });
}

// Animate progress fills
function animateFill(el, target) {
    setTimeout(() => { el.style.width = target; }, 100);
}

// Card stagger animation
function showCards() {
    return new Promise(resolve => {
        const cards = document.querySelectorAll('.t-card');
        cards.forEach((card, i) => {
            setTimeout(() => {
                card.classList.add('show');
                // Animate progress fills
                const pfill = card.querySelector('.pfill');
                if (pfill) {
                    const pct = card.querySelector('.pct');
                    if (pct && pct.textContent.includes('100')) pfill.style.width = '100%';
                    else if (pct && pct.textContent.includes('50')) pfill.style.width = '50%';
                }
            }, 150 * i);
        });
        setTimeout(resolve, 150 * cards.length + 500);
    });
}

// Show modal overlays
function showModal(id) {
    return new Promise(resolve => {
        document.getElementById(id).classList.add('show');
        setTimeout(resolve, 600);
    });
}

// Select quiz option
function selectOption(id) {
    return new Promise(resolve => {
        document.querySelectorAll('.option').forEach(o => o.classList.remove('selected'));
        document.getElementById(id).classList.add('selected');
        setTimeout(resolve, 500);
    });
}

// ═══ MAIN ANIMATION TIMELINE ═══
async function runAnimation() {
    // Start cursor off-screen
    cursor.style.left = '960px';
    cursor.style.top = '540px';

    // ── SCENE 1: Training List ──
    await new Promise(r => setTimeout(r, 500));

    // Animate main progress bar
    animateFill(document.getElementById('mainProgress'), '71%');

    // Stagger card reveal
    await showCards();
    await new Promise(r => setTimeout(r, 1200));

    // Move cursor to Skechers card
    await moveCursor(750, 460);
    await new Promise(r => setTimeout(r, 400));
    await clickCursor();
    await new Promise(r => setTimeout(r, 600));

    // ── SCENE 2: Content View ──
    await showScene('scene2');
    await new Promise(r => setTimeout(r, 600));

    // Animate content progress
    animateFill(document.getElementById('contentProgress'), '50%');

    // Animate slide elements
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('slideBrand').classList.add('show');
    await new Promise(r => setTimeout(r, 500));
    document.getElementById('slideSub').classList.add('show');
    await new Promise(r => setTimeout(r, 400));
    document.getElementById('slideTag').classList.add('show');

    await new Promise(r => setTimeout(r, 2000));

    // Move cursor to complete button
    await moveCursor(1450, 120);
    await new Promise(r => setTimeout(r, 300));
    await clickCursor();

    // Update progress
    document.getElementById('contentProgress').style.width = '100%';
    await new Promise(r => setTimeout(r, 1200));

    // ── SCENE 3: Quiz Start Modal ──
    await showScene('scene3');
    await new Promise(r => setTimeout(r, 300));
    await showModal('quizOverlay');
    await new Promise(r => setTimeout(r, 2000));

    // Move cursor to quiz start button
    await moveCursor(780, 570);
    await new Promise(r => setTimeout(r, 400));
    await clickCursor();
    await new Promise(r => setTimeout(r, 500));

    // ── SCENE 4: Quiz Question ──
    await showScene('scene4');
    await new Promise(r => setTimeout(r, 300));
    await showModal('questionOverlay');
    await new Promise(r => setTimeout(r, 1000));

    // Move cursor to option A
    await moveCursor(780, 360);
    await new Promise(r => setTimeout(r, 400));

    // Hover effect on A
    await new Promise(r => setTimeout(r, 300));

    // Move to option B and select
    await moveCursor(780, 415);
    await new Promise(r => setTimeout(r, 300));
    await clickCursor();
    await selectOption('optB');
    await new Promise(r => setTimeout(r, 800));

    // Click next
    await moveCursor(1060, 530);
    await new Promise(r => setTimeout(r, 300));
    await clickCursor();
    await new Promise(r => setTimeout(r, 800));

    // ── SCENE 5: Quiz Results ──
    await showScene('scene5');
    await new Promise(r => setTimeout(r, 300));
    await showModal('resultOverlay');
    await new Promise(r => setTimeout(r, 3000));

    // Move cursor to retry button
    await moveCursor(700, 560);
    await new Promise(r => setTimeout(r, 400));
    await clickCursor();
    await new Promise(r => setTimeout(r, 1000));

    // Move to close button
    await moveCursor(870, 560);
    await new Promise(r => setTimeout(r, 400));
    await clickCursor();
    await new Promise(r => setTimeout(r, 1500));

    // ── Back to Scene 1 ──
    await showScene('scene1');
    await new Promise(r => setTimeout(r, 500));
    showCards();
    animateFill(document.getElementById('mainProgress'), '71%');
    await new Promise(r => setTimeout(r, 2000));
}

// Start animation after page loads
window.addEventListener('load', () => {
    setTimeout(runAnimation, 800);
});
