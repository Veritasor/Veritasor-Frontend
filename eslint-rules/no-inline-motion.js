/**
 * Veritasor motion rule: `no-inline-motion`
 *
 * Flags direct `transition` / `animation` declarations inside JSX `style`
 * props. Motion must live in CSS (src/index.css or a co-located `<style>`
 * block) so every animation carries a co-located `prefers-reduced-motion`
 * override — see `docs/uiux/reduced-motion-fallback-spec.md`.
 */
export default {
  meta: {
    type: 'suggestion',
    docs: {
      description: 'Disallow direct transition/animation usage in JSX style props',
      category: 'Accessibility',
    },
    schema: [],
    messages: {
      inlineMotion:
        'Do not use "{{prop}}" in a JSX style prop. Move motion to a CSS class with a prefers-reduced-motion override (docs/uiux/reduced-motion-fallback-spec.md).',
    },
  },
  create(context) {
    return {
      JSXAttribute(node) {
        if (node.name.type !== 'JSXIdentifier' || node.name.name !== 'style') return
        const value = node.value
        if (!value || value.type !== 'JSXExpressionContainer') return
        const expr = value.expression
        if (!expr || expr.type !== 'ObjectExpression') return

        for (const prop of expr.properties) {
          if (prop.type !== 'Property') continue
          const key = prop.key
          if (!key) continue
          const keyName = key.type === 'Identifier' ? key.name : key.value
          if (keyName === 'transition' || keyName === 'animation') {
            context.report({
              node: prop,
              messageId: 'inlineMotion',
              data: { prop: keyName },
            })
          }
        }
      },
    }
  },
}
