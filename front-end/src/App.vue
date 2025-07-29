<script lang="ts" setup>
// https://github.com/vueuse/head
// you can use this to manipulate the document head in any components,
// they will be rendered correctly in the html results with vite-ssg
useHead({
	title: "Operation Opportunity",
	meta: [
		{
			name: "Operation Opportunity",
			content: "Class project for CS 260, revamped with Vitesse"
		},
		{
			name: "theme-color",
			content: () => (isDark.value ? "#00aba9" : "#ffffff")
		}
	],
	link: [
		{
			rel: "icon",
			type: "image/svg+xml",
			// This is identical for both dark and light mode for now
			href: () =>
				preferredDark.value
					? "/Favicons/favicon.ico"
					: "/Favicons/favicon.ico"
		}
	]
});
</script>

<template>
	<RouterView />
</template>

<style></style>
