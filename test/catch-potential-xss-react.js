import test from 'ava';
import avaRuleTester from 'eslint-ava-rule-tester';
import rule from '../rules/catch-potential-xss-react';

const ruleTester = avaRuleTester(test, {
  parserOptions: {
    ecmaVersion: 2018,
    sourceType: 'module',
    ecmaFeatures: {
      jsx: true
    }
  }
});

function testCase(code) {
  return {
    code,
    errors: [{ ruleId: 'catch-potential-xss-react' }]
  };
}

ruleTester.run('catch-potential-xss-react', rule, {
  valid: [
    testCase(`
      const Example = () => {
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
      const Example = () => {
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
      const Example = () => {
        const dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
        const sanitizedHtml = DOMPurify.sanitize(dangerousHtml);
        const sanitizedObject = { __html: sanitizedHtml };
        return (
          <div
            dangerouslySetInnerHTML={sanitizedObject}
          />
        );
      };
	  `),
    testCase(`
      const Example = () => {
        const dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
        let futureSanitizedHtml = "";
        futureSanitizedHtml = DOMPurify.sanitize(dangerousHtml);
        return (
          <div
            dangerouslySetInnerHTML={{__html: futureSanitizedHtml}}
          />
        );
      };
    `),
    testCase(`
      const Example = () => {
        const dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
        let futureSanitizedObject = "";
        futureSanitizedObject = { __html: DOMPurify.sanitize(dangerousHtml)};
        return (
          <div
            dangerouslySetInnerHTML={futureSanitizedObject}
          />
        );
      };
    `)
  ],
  invalid: [
    testCase(`
			const Example = () => {
				let dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
				return (
					<div
						dangerouslySetInnerHTML={{ __html: dangerousHtml }}
					/>
				);
			};
		`),
    testCase(`
			const Example = () => {
				const unsafeObject = { __html: "<img src=x onerror='javascript:alert(2)'>" };
				return (
					<div dangerouslySetInnerHTML={unsafeObject} />
				);
			};
		`),
    testCase(`
			const Example = () => {
				return (
					<div dangerouslySetInnerHTML={{}} />
				);
			};
		`),
    testCase(`
			const Example = () => {
				let futureUnsanitizedHtml = "";
				futureUnsanitizedHtml = "<img src=x onerror='javascript:alert(2)'>"
				return (
					<div
						dangerouslySetInnerHTML={{ __html: futureUnsanitizedHtml }}
					/>
				);
			};
		`)
  ]
});
