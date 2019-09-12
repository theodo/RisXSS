import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/catch-potential-xss-vue';

const ruleTester = avaRuleTester(test, {
	parser: require.resolve('vue-eslint-parser'),
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: 'module'
	}
});

function testCase(code) {
	return {
		code,
		errors: [{ ruleId: 'catch-potential-xss-vue' }]
	};
}

ruleTester.run('catch-potential-xss-vue', rule, {
	valid: [
		testCase(`
		<template>
			<div class="content">
				<div v-text="message" />
			</div>
		</template>
		<script></script>
	`),
		testCase(`
		<template>
			<div class="content">
				<div v-html="message" />
			</div>
		</template>

		<script>
		import DOMPurify from 'dompurify';
		const rawHtmlInput = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
		export default {
			name: 'HelloWorld',
			data () {
				return {
					message: DOMPurify.sanitize(rawHtmlInput)
				}
			}
		}
		</script>
		`)
	],
	invalid: [
		testCase(`
		<template>
			<div class="content">
				<div v-html="message" />
			</div>
		</template>
		<script></script>
		`),
		testCase(`
		<template>
			<div class="content">
				<div v-html="message" />
			</div>
		</template>

		<script>
		import DOMPurify from 'dompurify';
		const rawHtmlInput = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
		export default {
			name: 'HelloWorld',
			data () {
				return {
					message: rawHtmlInput
				}
			}
		}
		</script>
		`)
	]
});
