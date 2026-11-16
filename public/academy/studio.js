// Progressive enhancement: all content and consultation links work without JavaScript.
const tabs = [...document.querySelectorAll('[data-use]')];
const panels = [...document.querySelectorAll('.use-panel')];
if (tabs.length && tabs.length === panels.length) {
  const tablist = document.querySelector('.use-tabs');
  tablist.setAttribute('role', 'tablist');
  document.documentElement.classList.add('tabs-ready');
  const activate = (index, focus = false) => {
    tabs.forEach((tab, i) => {
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
      panels[i].hidden = i !== index;
    });
    if (focus) tabs[index].focus();
  };
  tabs.forEach((tab, i) => {
    tab.setAttribute('role', 'tab');
    tab.setAttribute('aria-controls', panels[i].id);
    panels[i].setAttribute('role', 'tabpanel');
    panels[i].tabIndex = 0;
    tab.addEventListener('click', () => activate(i));
    tab.addEventListener('keydown', (event) => {
      let next;
      if (event.key === 'ArrowRight') next = (i + 1) % tabs.length;
      if (event.key === 'ArrowLeft') next = (i + tabs.length - 1) % tabs.length;
      if (event.key === 'Home') next = 0;
      if (event.key === 'End') next = tabs.length - 1;
      if (next !== undefined) { event.preventDefault(); activate(next, true); }
    });
  });
  activate(0);
}
document.querySelectorAll('[data-plan]').forEach((link) => {
  link.addEventListener('click', () => {
    const interest = document.getElementById('consult-interest');
    interest.textContent = `ご相談のプラン：${link.dataset.plan}（予約・LINEでお伝えください）`;
    interest.hidden = false;
  });
});
