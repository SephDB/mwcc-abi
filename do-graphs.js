let dots = document.getElementsByClassName("language-dot");
[...dots].forEach(e => {
    Viz.instance().then(viz => {
        e.parentElement.style.textAlign = "center";
        e.replaceWith(viz.renderSVGElement(e.textContent));
    });
});