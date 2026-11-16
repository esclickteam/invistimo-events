import test from "node:test";
import assert from "node:assert/strict";

import { invitationDesignBounds } from "../../lib/invitations/designBounds";
import { opaquePixelBounds } from "../../lib/invitations/opaquePixelBounds";

test("the editor exports objects, and a background image keeps the whole stage", () => {
  const stage = { width: 400, height: 720 };

  const loose = invitationDesignBounds(
    [
      { type: "image", x: 40, y: 30, width: 320, height: 280 },
      { type: "text", x: 80, y: 40, width: 240, height: 48 },
    ],
    stage
  );
  assert.equal(loose.fullCanvas, false);
  assert.equal(loose.x, 40);
  assert.equal(loose.y, 30);
  assert.equal(loose.width, 320);
  assert.equal(loose.height, 280);
  assert.ok(loose.height < stage.height / 2);

  const withPaper = invitationDesignBounds(
    [
      { type: "image", isBackground: true, x: 0, y: 0, width: 400, height: 720 },
      { type: "text", x: 80, y: 40, width: 240, height: 48 },
    ],
    stage
  );
  assert.equal(withPaper.fullCanvas, true);
  assert.equal(withPaper.width, 400);
  assert.equal(withPaper.height, 720);

  const whitePaperRect = invitationDesignBounds(
    [{ type: "rect", x: 0, y: 0, width: 400, height: 720, fill: "#ffffff" }],
    stage
  );
  assert.equal(whitePaperRect.fullCanvas, true);

  assert.equal(invitationDesignBounds([], stage).fullCanvas, true);
});

test("uploaded pixels lose transparent padding and keep opaque white paper", () => {
  const width = 20;
  const height = 40;
  const data = new Uint8ClampedArray(width * height * 4);
  for (let y = 0; y < height; y += 1) {
    for (let x = 0; x < width; x += 1) {
      const offset = (y * width + x) * 4;
      const painted = y < 16;
      data[offset] = painted ? 200 : 255;
      data[offset + 1] = painted ? 160 : 255;
      data[offset + 2] = painted ? 90 : 255;
      data[offset + 3] = painted ? 255 : 0;
    }
  }
  const cropped = opaquePixelBounds(data, width, height);
  assert.deepEqual(cropped, { left: 0, top: 0, width: 20, height: 16 });

  data.fill(255);
  const paper = opaquePixelBounds(data, width, height);
  assert.deepEqual(paper, { left: 0, top: 0, width: 20, height: 40 });
});
