// cypress/e2e/navigation.spec.ts
/// <reference types="cypress" />

/**
 * Basic smoke-test for Operation Opportunity
 *
 * Things we prove:
 *   1. Home page renders and shows the H1 banner.
 *   2. The header links perform client-side navigation.
 *   3. A quote is fetched and rendered.
 *
 * NB:  Make sure the `baseUrl` in cypress.config.(ts|js) is
 *      `http://localhost:3333` (the same port you run `vite` with).
 */

context("Navigation & page smoke-tests", () => {
	beforeEach(() => {
		cy.intercept("GET", "/api/quotes*", {
			body: [{ content: "Make a start, then keep going.", author: "Quote integration fixture" }]
		}).as("quotes");
		cy.visit("/"); // -> Home
	});

	it("loads the home page", () => {
		cy.url().should("eq", `${Cypress.config().baseUrl}/`);
		cy.contains("Operation Opportunity").should("exist"); // <h1>
	});

	it("header links work", () => {
		// ---- About ---------------------------------------------------
		cy.contains("About").click();
		cy.url().should("eq", `${Cypress.config().baseUrl}/about`);
		cy.contains("About Us").should("exist");

		// ---- Signup --------------------------------------------------
		cy.contains("Signup").click();
		cy.url().should("eq", `${Cypress.config().baseUrl}/signup`);
		cy.contains("Sign Up").should("exist"); // H1 in signup.vue

		// ---- Support Us ---------------------------------------------
		cy.contains("Support Us").click();
		cy.url().should("eq", `${Cypress.config().baseUrl}/supportus`);
		cy.contains("Support Us").should("exist");

		// ---- back to Home -------------------------------------------
		cy.contains("Home").click();
		cy.url().should("eq", `${Cypress.config().baseUrl}/`);
	});

	it("shows a motivational quote on Home", () => {
		cy.wait("@quotes").its("request.query").should("deep.equal", {
			tags: "success",
			random: "true",
			limit: "1"
		});
		cy.get(".quote").should("contain.text", "Make a start, then keep going.");
		cy.get("#quote-author").should("have.text", "Quote integration fixture");
	});

	it("keeps a quote visible when the API is unavailable", () => {
		cy.intercept("GET", "/api/quotes*", { statusCode: 502, body: { error: "quotes_unavailable" } }).as(
			"failedQuotes"
		);
		cy.visit("/");
		cy.wait("@failedQuotes");
		cy.get(".quote").should("contain.text", "Success is the sum of small efforts");
		cy.get("#quote-author").should("have.text", "Robert Collier");
	});
});
