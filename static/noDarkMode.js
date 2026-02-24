// Default dark mode sucks, text is often unreadable. Removing the attribute results in flashing on
// page load, so this cursed method patching is the best solution I could think of. As a bonus,
// this doesn't disable the dark mode button itself (I guess it's using toggle() or something).

const htmlNode = document.documentElement.classList;

const trueAdd = htmlNode.add.bind(htmlNode);

htmlNode.add = (...tokens) => {
	trueAdd(...tokens.filter((x) => x !== "dark-mode"));
};
