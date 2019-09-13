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
		`),
		testCase(`
		<template>
			<div class="hello">
				<div v-html="message1"></div>
				<div v-html="message2"></div>
			</div>
		</template>

		<script>
			import DOMPurify from 'dompurify';
			const rawHtmlInput = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
			const purifiedHtml = DOMPurify.sanitize(rawHtmlInput);
			export default {
				name: 'HelloWorld',
				data () {
					return {
						message1: DOMPurify.sanitize(rawHtmlInput),
						message2: purifiedHtml,
					}
				}
			}
			</script>
		`),
		testCase(`
		<template>
			<div class="hello">
				<div v-html="message"></div>
			</div>
		</template>

		<script>
			import DOMPurify from 'dompurify';
			const rawHtmlInput = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
			let processedInput = "";
			processedInput = DOMPurify.sanitize(rawHtmlInput);
			export default {
				name: 'HelloWorld',
				data () {
					return {
						message: processedInput,
					}
				}
			}
			</script>
		`),
		testCase(`
		<template>
			<div class="hello">
				<div v-html="message"></div>
			</div>
		</template>

		<script>
			import DOMPurify from 'dompurify';
			const rawHtmlObject = { userInput: '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>' };
			let { userInput } = rawHtmlObject;
			userInput = DOMPurify.sanitize(userInput);
			export default {
				name: 'HelloWorld',
				data () {
					return {
						message: userInput,
					}
				}
			}
			</script>
		`),
		testCase(`
		<template>
			<div class="hello">
				<div v-html="message"></div>
			</div>
		</template>

		<script>
			import DOMPurify from 'dompurify';
			const rawHtml = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
			let userInput;
			userInput = { key: DOMPurify.sanitize(rawHtml) };
			export default {
				name: 'HelloWorld',
				data () {
					return {
						message: userInput[key],
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
				<div v-html="'message'" />
			</div>
		</template>
		<script></script>
		`),
		testCase(`
		<template>
			<div v-html="" />
		</template>
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
		`),
		testCase(`
		<template>
			<div class="hello">
				<div v-html="message1"></div>
				<div v-html="message2"></div>
			</div>
		</template>

		<script>
			import DOMPurify from 'dompurify';
			const rawHtmlInput = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
			const pirifiedHtml = rawHtmlInput;
			export default {
				name: 'HelloWorld',
				data () {
					return {
						message1: DOMPurify.sanitize(rawHtmlInput),
						message2: pirifiedHtml,
					}
				}
			}
			</script>
		`),
		testCase(`
		<template>
			<div class="hello">
				<div v-html="message"></div>
			</div>
		</template>

		<script>
			import DOMPurify from 'dompurify';
			const rawHtmlInput = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
			let processedInput = "";
			processedInput = rawHtmlInput;
			export default {
				name: 'HelloWorld',
				data () {
					return {
						message: processedInput,
					}
				}
			}
			</script>
		`),
		testCase(`
		<template>
			<div class="hello">
				<div v-html="message"></div>
			</div>
		</template>

		<script>
			import DOMPurify from 'dompurify';
			const rawHtmlObject = { userInput: '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>' };
			let { userInput } = rawHtmlObject;
			export default {
				name: 'HelloWorld',
				data () {
					return {
						message: userInput,
					}
				}
			}
			</script>
		`),
		testCase(`
		<template>
			<div class="hello">
				<div v-html="message"></div>
			</div>
		</template>

		<script>
			const rawHtml = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
			let userInput;
			userInput = { key: rawHtml };
			export default {
				name: 'HelloWorld',
				data () {
					return {
						message: userInput[key],
					}
				}
			}
		</script>
		`)
	]
});