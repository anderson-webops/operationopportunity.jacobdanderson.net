<script lang="ts" setup>
// https://github.com/vueuse/head
// you can use this to manipulate the document head in any components,
// they will be rendered correctly in the html results with vite-ssg
const siteUrl = "https://operationopportunity.jacobdanderson.net";
const siteDescription =
	"Operation Opportunity explains the project mission, public resources, and ways to participate in its education and opportunity-focused work.";
const route = useRoute();
const robotsContent = computed(() =>
	/^\/(?:api|profile)(?:\/|$)/.test(route.path)
		? "noindex,nofollow"
		: "index,follow,max-image-preview:large,max-snippet:-1,max-video-preview:-1"
);
const canonicalUrl = computed(() =>
	new URL(route.path || "/", `${siteUrl}/`).toString()
);
const structuredData = computed(() => [
	{
		"@context": "https://schema.org",
		"@type": "Organization",
		description: siteDescription,
		name: "Operation Opportunity",
		url: siteUrl
	},
	{
		"@context": "https://schema.org",
		"@type": "WebSite",
		description: siteDescription,
		name: "Operation Opportunity",
		url: siteUrl
	}
]);

useHead(
	() =>
		({
			title: "Operation Opportunity",
			meta: [
				{
					name: "description",
					content: siteDescription
				},
				{
					property: "og:title",
					content: "Operation Opportunity"
				},
				{
					property: "og:description",
					content: siteDescription
				},
				{
					property: "og:type",
					content: "website"
				},
				{
					property: "og:url",
					content: canonicalUrl.value
				},
				{
					name: "twitter:card",
					content: "summary"
				},
				{
					name: "twitter:title",
					content: "Operation Opportunity"
				},
				{
					name: "twitter:description",
					content: siteDescription
				},
				{
					name: "robots",
					content: robotsContent.value
				},
				{
					name: "theme-color",
					content: isDark.value ? "#00aba9" : "#ffffff"
				}
			],
			link: [
				{
					rel: "icon",
					type: "image/svg+xml",
					href: "/Favicons/favicon.ico"
				},
				{
					rel: "canonical",
					href: canonicalUrl.value
				}
			],
			script: [
				...(import.meta.env.PROD
					? [
							{
								defer: true,
								src: "https://analytics.jacobdanderson.net/script.js",
								"data-website-id":
									"bb94526b-ea35-4cf9-ab26-839ecba29361"
							}
						]
					: []),
				...structuredData.value.map((entry, index) => ({
					innerHTML: JSON.stringify(entry),
					key: `ld-json-${index}`,
					type: "application/ld+json"
				}))
			]
		}) as any
);
</script>

<template>
	<RouterView />
</template>

<style></style>
