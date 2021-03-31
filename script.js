const updateQuote = async () => {
  const url =
    "https://quote-garden.herokuapp.com/api/v3/quotes?genre=success&limit=100";
  let response = await fetch(url);
  let json = await response.json();
  console.log(json);
  return json;
};

updateQuote().then((data) => {
  let random = Math.floor(Math.random() * 99);
  let quote = data.data[random];
  let results = "";
  results += quote.quoteText;
  results += "<br>";
  results += "&emsp;&emsp;&emsp;<span>-" + quote.quoteAuthor + "</span>";
  document.getElementById("quotation").innerHTML = results;
});
