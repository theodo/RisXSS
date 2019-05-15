import test from "ava";
import avaRuleTester from "eslint-ava-rule-tester";
import rule from "../rules/catch-potential-xss";

const ruleTester = avaRuleTester(test, {
	parserOptions: {
		ecmaVersion: 2018,
		sourceType: "module",
		ecmaFeatures: {
			jsx: true
		}
	}
});

function testCase(code) {
	return {
		code,
		errors: [{ ruleId: 'catch-potential-xss' }]
	};
}

ruleTester.run("no-for-loop", rule, {
	valid: [
		testCase(`
		const Disclaimer = () => {
			let dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
		return (
			<div
				dangerouslySetInnerHTML={{
					__html: DOMPurify.sanitize(dangerousHtml)
				}}
			/>
		);
	};
`),
	testCase(`
	const Disclaimer = () => {
		let dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
		const sanitizedObject = { __html: DOMPurify.sanitize(dangerousHtml) };
	return (
		<div
			dangerouslySetInnerHTML={sanitizedObject}
		/>
	);
	};
`),

testCase(`
const Disclaimer = () => {
	const dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
	const sanitizedHtml = DOMPurify.sanitize(dangerousHtml2);
	const sanitizedObject = { __html: sanitizedHtml };
return (
	<div
		dangerouslySetInnerHTML={sanitizedObject}
	/>
);
};
`),

	],
	invalid: [
		testCase(`
			const Disclaimer = () => {
				let dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
			return (
				<div
					dangerouslySetInnerHTML={{
						__html: dangerousHtml
					}}
				/>
			);
		};
	`),
	testCase(`
	const Disclaimer = () => {
		const unsafeObject = { __html: "<img src=x onerror='javascript:alert(2)'>" };
	return (
		<div dangerouslySetInnerHTML={unsafeObject} />
	);
	};
`),
	]
});
