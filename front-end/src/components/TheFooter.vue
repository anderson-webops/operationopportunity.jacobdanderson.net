<script lang="ts" setup>
import { availableLocales, loadLanguageAsync } from "~/modules/i18n";

const { t, locale } = useI18n();

async function toggleLocales() {
  // change to some real logic
  const locales = availableLocales;
  const newLocale =
    locales[(locales.indexOf(locale.value) + 1) % locales.length];
  await loadLanguageAsync(newLocale);
  locale.value = newLocale;
}
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
							href="https://github.com/Jacoba1100254352/operationopportunity.audiot.info"
							target="_blank"
            ><img
              id="githubIcon"
              alt="github Icon"
              src="../../public/Images/github-dark.09072337.svg"
						/></a>
					</li>
				</ul>
			</nav>
		</div>

		<div class="Logo_and_rights">
			<br />
			<h2>AudioT.info</h2>
			<br />
			<nav class="footer_nav">
				<ul class="semantic_list">
					<li>Provo, UT, USA</li>
					<li>
						©2021
						<a
							href="https://jacobdanderson.net"
							style="text-decoration: none; color: inherit"
							target="_blank"
            >AudioT</a
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
