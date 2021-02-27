

const updateQuote = async () => {
    const url = "https://quote-garden.herokuapp.com/api/v3/quotes?genre=success&limit=100";
    let response = await fetch(url);
    let json = await response.json();
    console.log(json);
    return json;
}

updateQuote().then(data => {
    let random = Math.floor(Math.random() * 99);
    let quote = data.data[random];
    let results = "";
    results += quote.quoteText;
    results += "<br>"
    results += "&emsp;&emsp;&emsp;-" + quote.quoteAuthor;
    document.getElementById("quotation").innerHTML = results;
});

// const updateXKCD = async () => {
//     const url = "http://xkcd.com/info.0.json";
//     let response = await fetch(url);
//     let json = await response.json();
//     console.log(json);
//     return json;
// }
//
// updateXKCD().then(xkcd => {
//     // let xkcd = data.data;
//     let results = "";
//     results += "<img src=\"" + xkcd.img + "\" alt=\"" + xkcd.alt + "\"";
//     document.getElementsByClassName("research").innerHTML = results;
// });



