let dots = document.getElementsByClassName("language-dot");
[...dots].forEach(e => {
    Viz.instance().then(viz => {
        e.replaceWith(viz.renderSVGElement(e.textContent));
    });
});