const htmlParser = require('htmlparser');
const R = require('ramda');
const { paragraph, styles } = require('./helpers');
const htmlAttrs = {
    tag: {
        ul: 'unordered-list',
        ol: 'ordered-list',
        li: 'list-item',
        blockquote: 'blockquote',
        p: 'paragraph',
        h1: 'heading-1',
        h2: 'heading-2',
        h3: 'heading-3',
        h4: 'heading-4',
        h5: 'heading-5',
        h6: 'heading-6',
        hr: 'hr',
        br: 'br',
        a: 'hyperlink',
        b: 'bold',
        strong: 'bold',
        code: 'text',
        i: 'italic',
        em: 'italic',
        u: 'underline',
        img: 'embedded-asset-block',
        span: 'text',
        table: 'table',
        th: 'table-header-cell',
        tr: 'table-row',
        td: 'table-cell',
        div: 'paragraph',
    },
    text: 'text',
};

let transformed = []; //What should come out in the end

const transformDom = (dom) => {
    let results = [];

    R.forEach((elm) => {

        //RTF Tables in Contentful. Contentful currently pass a 'tbody' tag which isn't supported when importing. This removes it from the hierarchy.
        if (elm?.children?.[0].name == 'tbody') {
            elm.children.splice(0, 1, ...elm.children[0].children);
        }

        const { type, name, data, attribs, children } = elm;
        //console.log(elm);
        let content = [];
        let newData = {};

        if (children) {
            content = transformDom(children);
        }

        if (type === 'text') {
          if (data.trim() !== '') {
            newData = {
                data: {},
                marks: [],
                value: data,
                nodeType: type,
            };
          } else {
            newData = null;  // Collapse whitespace lines
          }
        } else if (type === 'tag') {
            switch(name) {
                case 'span':
                    //Spans seem to just be passed through
                    newData = content;
                    break;
                case 'code':
                    const Entities = require('html-entities').XmlEntities;
                    const entities = new Entities();

                    newData = R.map((node) => {
                        node = R.assoc('value', entities.decode(node.value), node);
                        node = R.assoc('marks', R.append({type: 'code'}, node.marks), node);
                        return node;
                    }, content);
                    break;

                case 'i':
                case 'em':
                case 'b':
                case 'strong':
                case 'u':
                    newData = styles(content, htmlAttrs[type][name]);
                    break;
                case 'a':
                    newData = {
                        data: { uri: R.propOr('', 'href', attribs) },
                        content,
                        nodeType: htmlAttrs[type][name],
                    };
                    break;
                case 'li':
                    //@TODO shouldn't need to cast to an array...
                    content = R.type(content) === 'Array' ? content : [content];
                    let newContent = [];

                    //Seems to want text wrapped in some type of content tag (p, h*, etc)
                    content = R.forEach((node)=> {
                        if (node.nodeType === 'text' || node.nodeType === 'hyperlink') {
                            //if the last of new content isn't a `paragraph`
                            if (R.propOr(false, 'nodeType', R.last(newContent)) !== 'paragraph') {
                                newContent = R.concat(newContent, paragraph([], 'paragraph'));
                            }
                            //put node in R.last(newContent).content
                            newContent[newContent.length - 1].content.push(node);
                        } else {
                            newContent = R.append(node, newContent);
                        }
                    }, content);

                    newData = {
                        data: {},
                        content: newContent,
                        nodeType: htmlAttrs[type][name],
                    };
                    break;
                case 'p':
                case 'h1':
                case 'h2':
                case 'h3':
                case 'h4':
                case 'h5':
                case 'h6':
                    newData = paragraph(content, htmlAttrs[type][name])
                    break
                default:
                    if (!htmlAttrs[type][name]) {
                        console.log('*** new data needed under -', type, name);
                    }

                    newData = {
                        data: {},
                        content,
                        nodeType: htmlAttrs[type][name],
                    };
                    break;
            }
        } else {
            console.log('***new type needed -', type, data);
        }

        if (newData !== null) {
          results = R.type(newData) === 'Array' ? R.concat(results, newData) : R.append(newData, results);
        }
    }, dom);
    return results;
};

const handleFn = (error, dom) => {
    if (error) {
        throw error;
    }
    transformed = {
        data: {},
        content: transformDom(dom),
        nodeType: 'document',
    };

    // Make sure if top level nodes are text we wrap them in a paragraph to make
    // the RTF valid:
    if (transformed.content.length > 0 && transformed.content[0].nodeType === 'text') {
        transformed.content = paragraph(transformed.content, 'paragraph');
    }
};

const parser = new htmlParser.Parser(new htmlParser.DefaultHandler(handleFn));

const parseHtml = (html) => {
    parser.parseComplete(html); //returns undefined...
    return transformed;
};

module.exports = {
    parseHtml,
};
