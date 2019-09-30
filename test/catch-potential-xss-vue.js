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
        <div class="content">
          <div v-html="message" />
        </div>
      </template>

      <script>
        import { sanitize } from 'dompurify';
        const rawHtmlInput = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
        export default {
          name: 'HelloWorld',
          data () {
            return {
              message: sanitize(rawHtmlInput)
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
    `),
    testCase(`
      <template>
        <div class="hello">
          <div v-html="message"></div>
        </div>
      </template>

      <script>
        import DOMPurify from "dompurify";
        const table = [
          DOMPurify.sanitize('<a onmouseover="alert(document.cookie)">Hover me!</a>')
        ];
        export default {
          name: "HelloWorld",
          data() {
            return {
              message: table[0]
            };
          }
        };
      </script>
    `),
    testCase(`
      <template>
        <div class="hello">
          <div v-html="message"></div>
        </div>
      </template>

      <script>
        import DOMPurify from "dompurify";
        const rawHtml = DOMPurify.sanitize(
          '<a onmouseover="alert(document.cookie)">Hover me!</a>'
        );
        const table = [rawHtml];
        export default {
          name: "HelloWorld",
          data() {
            return {
              message: table[0]
            };
          }
        };
      </script>
    `),
    testCase(`
      <template>
        <div class="postpreview">
          <p class="postpreview__posttext" v-html="renderedPostText" />
        </div>
      </template>

      <script>
        import { sanitize } from "dompurify";
        import { nl2br } from "~/services/FormatterHelper";
        export default {
        computed: {
          renderedPostText() {
            return sanitize(nl2br(this.postText));
          }
        }
        };
      </script>
    `),
    testCase(`
      <template>
        <div v-html="newsSanitizedText" />
      </template>

      <script>
        import { sanitize } from "dompurify";

        export default {
          name: "NewsBar",
          data() {
            return {
              newsSanitizedText: ""
            };
          },
          async mounted() {
            try {
              this.newsData = await fetchApi("content", {
                _locale: this.$i18n.locale
              });
              if (this.newsData) {
                this.newsSanitizedText = sanitize(this.newsData.content);
              }
            } catch (error) {
              console.log(error);
            }
          }
        };
      </script>
    `),
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
    `),
    testCase(`
      <template>
        <div class="hello">
          <div v-html="message"></div>
        </div>
      </template>

      <script>
        const table = ['<a onmouseover="alert(document.cookie)">Hover me!</a>'];
        export default {
          name: "HelloWorld",
          data() {
            return {
              message: table[0]
            };
          }
        };
      </script>
    `),
    testCase(`
      <template>
        <div class="hello">
          <div v-html="message"></div>
        </div>
      </template>

      <script>
        const rawHtml = '<a onmouseover="alert(document.cookie)">Hover me!</a>'
        const table = [rawHtml];
        export default {
          name: "HelloWorld",
          data() {
            return {
              message: table[0]
            };
          }
        };
      </script>
    `),
    testCase(`
      <template>
        <p v-html="$t('analyze.modal.freemium.results')" />
      </template>
    `),
    testCase(`
      <template>
        <p class="pagetitle__subtitle" v-html="nl2br(subtitle)" />
      </template>
    `)
  ]
});
