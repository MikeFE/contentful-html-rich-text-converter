const R = require('ramda');

const nl = (content) => process.stdout.write('\n'+content+'\n');

/**
 * compare original contentful data to generated data
 */
const compare = (transformed, richText, html, extension = [], json) => {
    const gen = R.pathOr('undefined', extension, transformed);
    const cont = R.pathOr('undefined', extension, richText);
    const equal = JSON.stringify(gen) === JSON.stringify(cont);

    if (typeof json === 'boolean') {
        nl('**html**');
        console.log(html);

        if (json) {
            nl('**generated**');
            console.log(JSON.stringify(gen));
            nl('**contentful**');
            console.log(JSON.stringify(cont));
        } else {
            nl('**generated**');
            console.log(gen);
            nl('**contentful**');
            console.log(cont);
        }

        nl('**equal**');
        console.log(equal);
    }

    return equal;
};

const { parseHtml } = require('../index');
const { documentToHtmlString } = require('@contentful/rich-text-html-renderer');
const { BLOCKS } = require('@contentful/rich-text-types');

/**
 * Only for testing our `parseHtml()`
 */
const runTest = (richText, extension = [], json) => {
    const options = {
        renderNode: {
            [BLOCKS.EMBEDDED_ASSET]: ({ data: { target: { fields }}}) =>
                `<img src="${fields.file.url}" height="${fields.file.details.image.height}" width="${fields.file.details.image.width}" alt="${fields.description}"/>`,
        },
    };
    const html = documentToHtmlString(richText, options);

    const transformed = parseHtml(html); // leads to handlFn

    return compare(transformed, richText, html, extension, json);
};
/*
const contentful = require('contentful');
//Create a creds.json file with fields `space`, `accessToken`
const creds = require('../creds.json');
const getContentfulContent = () => {
    contentful.createClient(creds).getEntries({
        content_type: 'sample',
        'fields.name[in]': 'Test',
    }).then((entries) => {
        runTest(entries.items[0].fields.richText, [], true);
    }).catch((e) => {
        throw e;
    });
};

getContentfulContent();
/*/
const printRes = (title, file) => {
    const res = runTest(require(file));
    const color = res ? "\x1b[42m" : "\x1b[41m";
    const status = res ? '✓' : '×';
    console.log(color, status, "\x1b[0m", title); //valid
}
/*
//https://jsonformatter.org/
printRes('Bold, Italic, Underline', './boldItalicUnderline.json');
printRes('ul', './ul.json');
printRes('ol', './ol.json');
printRes('hr', './hr.json');
printRes('blockquote', './blockquote.json');
printRes('headings', './headings.json');
printRes('hyperlink', './hyperlink.json');
printRes('codeblock', './codeblock.json');
printRes('Break Things #1', './break1.json');
//Still broken
//console.log('img:' + runTest(require('./img.json'), ['content', 0, 'data', 'target'], false));
//printRes('img', './img.json');
//*/

const htmlTest = (html) => {
    const json = parseHtml(html);
    const options = {
        renderNode: {
            [BLOCKS.EMBEDDED_ASSET]: ({ data: { target: { fields }}}) =>
                `<img src="${fields.file.url}" height="${fields.file.details.image.height}" width="${fields.file.details.image.width}" alt="${fields.description}"/>`,
        },
    };
    const newHtml = documentToHtmlString(json, options);
    nl('** Original **');
    console.log(html);
    nl('** New **');
    console.log(newHtml);
    return html === newHtml;
}


console.log(htmlTest('<ul><li><span><span>Do not</span></span></li>\n\t<li><span><span>You must work.</span></span></li>\n\t<li><span><span>You may need to risk software.</span></span></li>\n</ul>'));
