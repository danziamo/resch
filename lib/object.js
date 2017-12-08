'use strict';

const validateReSchemaErrors = require('./gen-errors')
    , validateObject = require('./validate-object')
    , getDefaults = require('./get-defaults')
    ;

const reSchemaErrors = validateReSchemaErrors(validateObject);

module.exports = React => {
    const $ = React.createElement;
    const schemaErrors = reSchemaErrors(React);
    return genForm => {

        function genItemizer (config) {
            const schema = config.schema
                , path = Array.isArray(config.path) ? config.path : []
                , updateState = config.updateState;

            let objKeys = Object.keys(schema);
            let arr = {};
            let keys = {};
            let lastIndex = 0;

            return {
                get: function (item) {
                    const owns = objKeys.indexOf(item) !== -1;
                    if (keys[item] === undefined) {
                        keys[item] = lastIndex;
                        lastIndex += 1;

                        const selfPath = path.concat([item]);

                        let handleDelete;
                        if (typeof updateState === 'function') {
                            const selfBody = { $unset: [item] };
                            const selfSpec = {
                                data: path.reduceRight((prev, key) => ({ [key]: prev }), selfBody),
                                focus: { $set: undefined }
                            };

                            handleDelete = function () {
                                updateState(selfSpec);
                            };
                        }

                        const Form = genForm({
                            schema: owns ? schema.properties[item] : schema.additionalProperties,
                            path: selfPath,
                            updateState: updateState
                        });

                        arr[keys[item]] = function Ari (props) {

                            return $(Form, props,
                                $('button',
                                    {
                                        type: 'button',
                                        onClick: handleDelete
                                    },
                                    '-'
                                ),
                                !owns && $('input', { type: 'text', value: props.title })
                            );
                        };
                    }
                    return arr[keys[item]];
                }
            };
        }

        return config => {
            const schema = config.schema;
            const updateState = config.updateState;
            const path = config.path;
            const Errors = schemaErrors(schema);
            const itemizer = genItemizer(config);

            let handleAdd;
            if (typeof updateState === 'function') {
                const focusSpec = { $set: path };
                const itemSpec = getDefaults(schema.additionalProperties);
                const arrayBody = { $auto: { '': { $set: itemSpec } } };
                const arraySpec = {
                    data: path.reduceRight((prev, key) => ({ [key]: prev }), arrayBody),
                    focus: focusSpec
                };
                handleAdd = function () {
                    focusSpec.$set = path.concat(['']);
                    updateState(arraySpec);
                };
            }

            return class Obj extends React.Component {

                constructor (props) {
                    super(props);
                }

                shouldComponentUpdate (nextProps) {
                    return !(
                        nextProps.data === this.props.data &&
                        nextProps.focus === undefined &&
                        nextProps.readonly === this.props.readonly
                    );
                }

                render () {
                    const data = this.props.data || {}
                        , focus = this.props.focus
                        ;
                    return (
                        $('li', {},
                            this.props.children,
                            typeof schema.additionalProperties === 'object' &&
                                $('button', {
                                    type: 'button',
                                    onClick: handleAdd
                                }, '+'),
                            schema.title,
                            $('ul', {},
                                Object.keys(data).map((e, i) =>
                                    $(itemizer.get(e), {
                                        key: i,
                                        data: data[e],
                                        title: e
                                    })
                                )
                            ),
                            $(Errors, this.props)
                        )
                    );
                }
            };
        };
    };
};
