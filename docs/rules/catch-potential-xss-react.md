# Enforce the use of dompurify when using dangerouslySetInnerHtml

## Fail

```js
    const Example = () => {
      let dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
      return (
        <div
          dangerouslySetInnerHTML={{ __html: dangerousHtml }}
        />
      );
    };
```

```js
    const Example = () => {
      const unsafeObject = { __html: "<img src=x onerror='javascript:alert(2)'>" };
      return (
        <div dangerouslySetInnerHTML={unsafeObject} />
      );
    };
```

```js
    const Example = () => {
      return (
        <div dangerouslySetInnerHTML={{}} />
      );
    };
```

```js
    const Example = () => {
      let futureUnsanitizedHtml = "";
      futureUnsanitizedHtml = "<img src=x onerror='javascript:alert(2)'>"
      return (
        <div
          dangerouslySetInnerHTML={{ __html: futureUnsanitizedHtml }}
        />
      );
    };
```

## Pass

```js
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
```

```js
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
```

```js
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
```

```js
  const Example = () => {
    let dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
    const sanitizedObject = { __html: DOMPurify.sanitize(dangerousHtml) };
    return (
      <div
        dangerouslySetInnerHTML={sanitizedObject}
      />
    );
  };
```

```js
  const Example = () => {
    let dangerousHtml = "<img src=x onerror='javascript:alert(1)'>";
    const sanitizedObject = { __html: DOMPurify.sanitize(dangerousHtml) };
    return (
      <div
        dangerouslySetInnerHTML={sanitizedObject}
      />
    );
  };
```

```js
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
```

```js
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
```