const updateQuote = async () => {
	const url = ""; //"https://quote-garden.herokuapp.com/api/v3/quotes?genre=success&limit=100";
	try {
		const response = await fetch(url);
		const json = await response.json();
		console.log(json);
		return json;
	} catch (error) {
		console.error(error);
		return {}; // return an empty object or any default value
	}
};

updateQuote().then(data => {
	const random = Math.floor(Math.random() * 99);
	const quote = data.data[random];
	let results = "";
	results += quote.quoteText;
	results += "<br>";
	results += "&emsp;&emsp;&emsp;<span>-" + quote.quoteAuthor + "</span>";
	document.getElementById("quotation").innerHTML = results;
});
