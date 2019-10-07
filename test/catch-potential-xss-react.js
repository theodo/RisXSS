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
      import { sanitize } from 'dompurify';
      const Example = () => {
        let dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
        return (
          <div
            dangerouslySetInnerHTML={{
              __html: sanitize(dangerousHtml)
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
    `),
    testCase(`
      const getHtml = () => {
        const dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
        const sanitizedHtml = DOMPurify.sanitize(dangerousHtml);
        const sanitizedObject = { __html: sanitizedHtml };

        return sanitizedObject;
      };
      const Example = () => {
        return (
          <div
            dangerouslySetInnerHTML={getHtml()}
          />
        );
      };
    `),
    testCase(`
      function functionWithMultipleReturn() {
        switch (message) {
          case 'Literal':
            if (test = 4) {
              return DOMPurify.sanitize('4');
            }
            return DOMPurify.sanitize(test);
          case 'Identifier':
            return DOMPurify.sanitize('Danger');
          default:
            return DOMPurify.sanitize('Oups default not sanitized');
        }
        while (message.length > 0) {
          if (this.postTest) {
            return DOMPurify.sanitize('I am a dangerous text');
          }
        }
        return DOMPurify.sanitize(message);
      }
      const Example = () => {
        return (
          <div
            dangerouslySetInnerHTML={functionWithMultipleReturn()}
          />
        );
      };
    `),
    testCase(`
      const Example = () => {
        const dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
        const messageObject = {html: DOMPurify.sanitize(dangerousHtml), otherMessage: 'not sanitized'};
        return (
          <div
            dangerouslySetInnerHTML={{__html: messageObject.html}}
          />
        );
      };
    `),
    testCase(`
      const Example = () => {
        const dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
        const messageArray = [DOMPurify.sanitize(dangerousHtml), DOMPurify.sanitize('not sanitized')];
        return (
          <div
            dangerouslySetInnerHTML={{__html: messageArray[0]}}
          />
        );
      };
    `),
  ],
  invalid: [
    testCase(`
      const Example = () => {
        return (
          <div
            dangerouslySetInnerHTML="<img src=x onerror='javascript:alert(1)'>"
          />
        );
      };
    `),
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
      const sanitize = (message) => {
        //doesn't sanitize anything
        return message
      }
      const Example = () => {
        let dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
        return (
          <div
            dangerouslySetInnerHTML={{
              __html: sanitize(dangerousHtml)
            }}
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
    `),
    testCase(`
      const getHtml = () => {
        const dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
        const dangerousObject = { __html: dangerousHtml };

        return dangerousObject;
      };
      const Example = () => {
        return (
          <div
            dangerouslySetInnerHTML={getHtml()}
          />
        );
      };
    `),
    testCase(`
      const Example = () => {
        const dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
        const messageObject = {html: dangerousHtml, otherMessage: 'not sanitized'};
        return (
          <div
            dangerouslySetInnerHTML={{__html: messageObject.html}}
          />
        );
      };
    `),
    testCase(`
      const Example = () => {
        const dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
        const messageArray = [dangerousHtml, DOMPurify.sanitize('not sanitized')];
        return (
          <div
            dangerouslySetInnerHTML={{__html: messageArray[0]}}
          />
        );
      };
    `),
    testCase(`
      function functionWithMultipleReturn() {
        switch (message) {
          case 'Literal':
            if (test = 4) {
              return '4';
            }
            return DOMPurify.sanitize(test);
          case 'Identifier':
            return DOMPurify.sanitize('Danger');
          default:
            return DOMPurify.sanitize('Oups default not sanitized');
        }
        while (message.length > 0) {
          if (this.postTest) {
            return DOMPurify.sanitize('I am a dangerous text');
          }
        }
        return DOMPurify.sanitize(message);
      }
      const Example = () => {
        return (
          <div
            dangerouslySetInnerHTML={functionWithMultipleReturn()}
          />
        );
      };
    `),
  ]
});
