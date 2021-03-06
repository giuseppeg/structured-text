import {
  render as genericHtmlRender,
  renderRule,
} from 'datocms-structured-text-generic-html-renderer';
import {
  Adapter,
  isBlock,
  isInlineItem,
  isItemLink,
  isStructuredText,
  Node,
  Record as StructuredTextGraphQlResponseRecord,
  RenderError,
  RenderResult,
  RenderRule,
  StructuredText as StructuredTextGraphQlResponse,
} from 'datocms-structured-text-utils';
import vhtml from 'vhtml';

export {
  renderRule,
  RenderError,
  StructuredTextGraphQlResponse,
  StructuredTextGraphQlResponseRecord,
};

type AdapterReturn = string | null;

const vhtmlAdapter = (
  tagName: string,
  attrs?: Record<string, string> | null,
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ...children: any[]
): AdapterReturn => {
  if (attrs) {
    delete attrs.key;
  }

  return vhtml(tagName, attrs, ...children);
};

export const defaultAdapter = {
  renderNode: vhtmlAdapter,
  renderFragment: (children: AdapterReturn[]): string => children.join(''),
  renderText: (text: string): AdapterReturn => text,
};

type H = typeof defaultAdapter.renderNode;
type T = typeof defaultAdapter.renderText;
type F = typeof defaultAdapter.renderFragment;

type RenderInlineRecordContext<
  R extends StructuredTextGraphQlResponseRecord
> = {
  record: R;
  adapter: Adapter<H, T, F>;
};

type RenderRecordLinkContext<R extends StructuredTextGraphQlResponseRecord> = {
  record: R;
  adapter: Adapter<H, T, F>;
  children: RenderResult<H, T, F>;
};

type RenderBlockContext<R extends StructuredTextGraphQlResponseRecord> = {
  record: R;
  adapter: Adapter<H, T, F>;
};

export type RenderSettings<R extends StructuredTextGraphQlResponseRecord> = {
  /** A set of additional rules to convert the document to HTML **/
  customRules?: RenderRule<H, T, F>[];
  /** Fuction that converts an 'inlineItem' node into an HTML string **/
  renderInlineRecord?: (context: RenderInlineRecordContext<R>) => string | null;
  /** Fuction that converts an 'itemLink' node into an HTML string **/
  renderLinkToRecord?: (context: RenderRecordLinkContext<R>) => string | null;
  /** Fuction that converts a 'block' node into an HTML string **/
  renderBlock?: (context: RenderBlockContext<R>) => string | null;
  /** Fuction that converts a simple string text into an HTML string **/
  renderText?: T;
  /** React.createElement-like function to use to convert a node into an HTML string **/
  renderNode?: H;
  /** Function to use to generate a React.Fragment **/
  renderFragment?: F;
};

export function render<R extends StructuredTextGraphQlResponseRecord>(
  /** The actual field value you get from DatoCMS **/
  structuredTextOrNode:
    | StructuredTextGraphQlResponse<R>
    | Node
    | null
    | undefined,
  /** Additional render settings **/
  settings?: RenderSettings<R>,
): ReturnType<F> | null {
  const mergedSettings: RenderSettings<R> = {
    renderText: defaultAdapter.renderText,
    renderNode: defaultAdapter.renderNode,
    renderFragment: defaultAdapter.renderFragment,
    customRules: [],
    ...settings,
  };

  const {
    renderInlineRecord,
    renderLinkToRecord,
    renderBlock,
    customRules,
  } = mergedSettings;

  const result = genericHtmlRender(
    {
      renderText: mergedSettings.renderText,
      renderNode: mergedSettings.renderNode,
      renderFragment: mergedSettings.renderFragment,
    },
    structuredTextOrNode,
    [
      ...customRules,
      renderRule(isInlineItem, ({ node, adapter }) => {
        if (!renderInlineRecord) {
          throw new RenderError(
            `The Structured Text document contains an 'inlineItem' node, but no 'renderInlineRecord' option is specified!`,
            node,
          );
        }

        if (
          !isStructuredText(structuredTextOrNode) ||
          !structuredTextOrNode.links
        ) {
          throw new RenderError(
            `The document contains an 'inlineItem' node, but the passed value is not a Structured Text GraphQL response, or .links is not present!`,
            node,
          );
        }

        const structuredText = structuredTextOrNode;

        const item = structuredText.links.find((item) => item.id === node.item);

        if (!item) {
          throw new RenderError(
            `The Structured Text document contains an 'inlineItem' node, but cannot find a record with ID ${node.item} inside .links!`,
            node,
          );
        }

        return renderInlineRecord({ record: item, adapter });
      }),
      renderRule(isItemLink, ({ node, children, adapter }) => {
        if (!renderLinkToRecord) {
          throw new RenderError(
            `The Structured Text document contains an 'itemLink' node, but no 'renderLinkToRecord' option is specified!`,
            node,
          );
        }

        if (
          !isStructuredText(structuredTextOrNode) ||
          !structuredTextOrNode.links
        ) {
          throw new RenderError(
            `The document contains an 'itemLink' node, but the passed value is not a Structured Text GraphQL response, or .links is not present!`,
            node,
          );
        }

        const structuredText = structuredTextOrNode;

        const item = structuredText.links.find((item) => item.id === node.item);

        if (!item) {
          throw new RenderError(
            `The Structured Text document contains an 'itemLink' node, but cannot find a record with ID ${node.item} inside .links!`,
            node,
          );
        }

        return renderLinkToRecord({
          record: item,
          adapter,
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          children: (children as any) as ReturnType<F>,
        });
      }),
      renderRule(isBlock, ({ node, adapter }) => {
        if (!renderBlock) {
          throw new RenderError(
            `The Structured Text document contains a 'block' node, but no 'renderBlock' option is specified!`,
            node,
          );
        }

        if (
          !isStructuredText(structuredTextOrNode) ||
          !structuredTextOrNode.blocks
        ) {
          throw new RenderError(
            `The document contains a 'block' node, but the passed value is not a Structured Text GraphQL response, or .blocks is not present!`,
            node,
          );
        }

        const structuredText = structuredTextOrNode;

        const item = structuredText.blocks.find(
          (item) => item.id === node.item,
        );

        if (!item) {
          throw new RenderError(
            `The Structured Text document contains a 'block' node, but cannot find a record with ID ${node.item} inside .blocks!`,
            node,
          );
        }

        return renderBlock({ record: item, adapter });
      }),
    ],
  );

  return result;
}
