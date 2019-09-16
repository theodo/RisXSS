# Enforce the use of dompurify when using dangerouslySetInnerHtml

## Fail

```html
    <template>
			<div v-html="message" />
		</template>

		<script>
		const rawHtmlInput = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
		export default {
			data () {
				return {
					message: rawHtmlInput
				}
			}
		}
		</script>
```

```html
    <template>
			<div v-html="message" />
		</template>

		<script>
		const rawHtmlObject = { rawHtml: '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>' };
		export default {
			data () {
				return {
					message: rawHtmlObject[rawHtml]
				}
			}
		}
		</script>
```

```html
    <template>
			<div v-html="'message'" />
		</template>
```

```html
    <template>
			<div v-html="message" />
		</template>

		<script>
    let futureRawHtml = '';
    futureRawHtml = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
		export default {
			data () {
				return {
					message: futureRawHtml
				}
			}
		}
		</script>
```

## Pass

```html
  <template>
    <div v-html="message"></div>
  </template>

  <script>
    import DOMPurify from 'dompurify';
    const sanitizedInput = DOMPurify.sanitize('<a onmouseover=\"alert(document.cookie)\">Hover me!</a>');
    export default {
      data () {
        return {
          message: sanitizedInput,
        }
      }
    }
	</script>
```

```html
  <template>
    <div v-html="message"></div>
  </template>

  <script>
    import DOMPurify from 'dompurify';
    const rawHtml = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
    const sanitizedInput = DOMPurify.sanitize(rawHtml);
    export default {
      data () {
        return {
          message: sanitizedInput,
        }
      }
    }
	</script>
```

```html
  <template>
    <div v-html="message"></div>
  </template>

  <script>
    import DOMPurify from 'dompurify';
    const rawHtml = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
    const sanitizedInput = { html: DOMPurify.sanitize(rawHtml) };
    export default {
      data () {
        return {
          message: sanitizedInput[html],
        }
      }
    }
	</script>
```


```html
  <template>
    <div v-html="message"></div>
  </template>

  <script>
    import DOMPurify from 'dompurify';
    const rawHtml = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
    const sanitizedInput = { html: DOMPurify.sanitize(rawHtml) };
    export default {
      data () {
        return {
          message: sanitizedInput[html],
        }
      }
    }
	</script>
```


```html
  <template>
    <div v-html="message"></div>
  </template>

  <script>
    import DOMPurify from 'dompurify';
    const rawHtml = '<a onmouseover=\"alert(document.cookie)\">Hover me!</a>';
    const sanitizedHtml = DOMPurify.sanitize(rawHtml);
    const sanitizedInput = { html: sanitizedHtml };
    export default {
      data () {
        return {
          message: sanitizedInput[html],
        }
      }
    }
	</script>
```
