<script lang="ts" setup>
const startYear = 2021;
const currentYear = new Date().getFullYear();
const copyrightYear =
	currentYear > startYear ? `${startYear}-${currentYear}` : `${currentYear}`;
</script>

<template>
	<footer class="text-center">
		<div class="github">
			<br />
			<h2>Github</h2>
			<br />
			<nav class="footer_nav">
				<ul class="semantic_list">
					<li>
						<a
							href="https://github.com/anderson-webops/operationopportunity.jacobdanderson.net"
							rel="noopener noreferrer"
							target="_blank"
							><img
								id="githubIcon"
								alt="github Icon"
								loading="lazy"
								src="../assets/Images/github-dark.09072337.svg"
						/></a>
					</li>
				</ul>
			</nav>
		</div>

		<div class="Logo_and_rights">
			<br />
			<h2>Operation Opportunity</h2>
			<br />
			<nav class="footer_nav">
				<ul class="semantic_list">
					<li>Provo, UT, USA</li>
					<li>
						©{{ copyrightYear }}
						<a
							class="footer-site-link"
							href="https://operationopportunity.jacobdanderson.net"
							>Operation Opportunity</a
						>. All rights reserved.
					</li>
				</ul>
			</nav>
		</div>

		<!--			<p v-if="error" class="error">{{ error }}</p> -->

		<div class="ip pb-1">
			<p id="ip" />
		</div>
	</footer>
</template>

<style scoped>
.footer-site-link {
	color: inherit;
	text-decoration: none;
}
</style>
