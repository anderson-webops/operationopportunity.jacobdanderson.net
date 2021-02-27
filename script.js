document.getElementById("infoSubmit").addEventListener("click", function(event) {
    event.preventDefault();
    const email = document.getElementById("emailInput").value;
    if (email === "") return;
    console.log(email);

    let access_key = '0c104d85423e97239ca81203cc2ac790';
    const url = "http://apilayer.net/api/check?access_key=" + access_key + "&email=" + email + "&stmp=1&format=1";
    fetch(url).then(function(response) {
        return response.json();
    }).then(function(json) {
        let emailValid = "";
        if(json.format_valid === true){
            emailValid += "Valid email!" ;
        } else {
            emailValid += "Invalid email. Try again. ";
        }
        document.getElementById("valid").innerHTML = emailValid;
        console.log(json.format_valid);
    });

});

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



