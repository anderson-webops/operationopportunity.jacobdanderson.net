<script lang="ts" setup>
const startYear = 2021;
const currentYear = new Date().getFullYear();
const copyrightYear = currentYear > startYear ? `${startYear}-${currentYear}` : `${currentYear}`;
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
							href="https://operationopportunity.jacobdanderson.net"
							style="text-decoration: none; color: inherit"
							target="_blank"
							>Operation Opportunity</a
						>. All rights reserved.
					</li>
				</ul>
			</nav>
		</div>

		<div class="parter">
			<br />
			<h2 />
			<br />
			<nav class="footer_nav">
				<ul class="semantic_list">
					<li>
						<a
							href=""
							style="text-decoration: none; color: inherit"
							target="_blank"
						/>
					</li>
				</ul>
				<br />
				<p />
			</nav>
		</div>

		<!--			<p v-if="error" class="error">{{ error }}</p> -->

		<div class="ip pb-1">
			<p id="ip" />
		</div>
	</footer>
</template>

<style scoped></style>
