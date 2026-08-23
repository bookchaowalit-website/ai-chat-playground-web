# Model Bench — Design direction

## Product surface

The Chat Playground is a local comparison bench: one prompt is transmitted to selected configured models, then each response is read beside the others. The honest empty state is part of the product because deployment keys may not be present.

## Visual world

- **Seed:** \`3e41f3b8\`, assigned direction index \`6\` (\`operate\`)
- **World:** a paper-and-ink model testing bench, where the prompt is a transmission and each model is a channel lane.
- **Palette:** warm instrument paper \`#eeeadd\`, charcoal ink \`#20211f\`, oxidized orange signal \`#cf6c2d\`, and a quiet ruled line \`#c7c4b5\`.
- **Typography:** Space Grotesk carries operational display and body; IBM Plex Mono is reserved for channel IDs, status, and measurement.
- **Composition:** an open work surface with ruled bands, a prompt field, channel rows, and response lanes. The interface uses a workbench rhythm rather than a card dashboard.
- **Interaction:** arm/disarm model channels, place one prompt on the bench, then read parallel response lanes. The signal marker and lane rule make state visible without relying on color alone.
- **Responsive:** channel metadata compresses before the prompt or response content; response lanes stack on narrow screens.

## Craft constraints

No provider capability is implied when keys are absent. The UI must keep model state, errors, latency, and empty results legible. Focus rings, reduced motion, and real textarea semantics remain part of the visual language.

