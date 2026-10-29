/**
 * Finding messages, in plain language: what's wrong, then what to use instead.
 * Wording can change freely; baselines match on code, file, and subject.
 */

export const message = Object.freeze({
  hardcodedColor: (value) =>
    `${value} is a hardcoded color. Use a color token from the design system instead.`,

  arbitraryValue: (value) =>
    `${value} is a one-off size. Use a spacing or size token from the design system instead.`,

  unknownComponent: (name) =>
    `<${name}> isn't part of the design system. Use a design-system component instead.`,

  unknownElement: (name) =>
    `<${name}> isn't part of the design system. Use one of its elements instead.`,

  nativeElement: (tag, component) =>
    `Plain <${tag}> where the design system has <${component}>. Use <${component}> instead.`,

  unknownToken: (name) =>
    `${name} isn't a design-system token. Use one the design system publishes instead.`,

  unknownProp: (component, prop) => `<${component}> has no ${prop} prop.`,

  invalidPropValue: (component, prop, value, allowed) =>
    `<${component}> doesn't accept ${prop}="${value}". Use one of: ${allowed.join(', ')}.`,

  invalidPropType: (component, prop, type) => `<${component}> expects ${prop} to be a ${type}.`,

  invalidPropCombo: (component, shown) => `<${component}> can't use ${shown} together.`,

  restyle: (component, via) =>
    `${via} on <${component}> paints over a design-system component. Use one of its props or a token instead.`,
});
