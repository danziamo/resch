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

            return {
                get: function (index) {
                    const owns = objKeys.indexOf(index) !== -1;
                    if (arr[index] === undefined) {

                        const selfPath = path.concat([index]);

                        let handleDelete;
                        let handleChange;
                        let timer;
                        if (typeof updateState === 'function') {
                            const selfBody = { $unset: [index] };
                            const selfSpec = {
                                data: path.reduceRight((prev, key) => ({ [key]: prev }), selfBody),
                                focus: { $set: undefined }
                            };

                            handleDelete = function () {
                                updateState(selfSpec);
                            };

                            handleChange = function(e) {
                                clearTimeout(timer);
                                const newKey = e.target.value;
                                timer = setTimeout(function() {
                                    const changeBody = (obj) => {
                                        const ret = {};
                                        Object.keys(obj).forEach(e => {
                                            if (e === index) {
                                                ret[newKey] = obj[e];
                                            } else {
                                                ret[e] = obj[e];
                                            }
                                        });
                                        return ret;
                                    };
                                    const changeSpec = {
                                        data: path.reduceRight((prev, key) => ({ [key]: prev }), changeBody)
                                    }
                                    updateState(changeSpec);
                                    delete arr[index]
                                }, 600);
                            }
                        }

                        const Form = genForm({
                            schema: owns ? schema.properties[index] : schema.additionalProperties,
                            path: selfPath,
                            updateState: updateState
                        });

                        arr[index] = function Ari (props) {
                            return $(Form, props,
                                $('button',
                                    {
                                        type: 'button',
                                        onClick: handleDelete
                                    },
                                    '-'
                                ),
                                !owns && $('input', {
                                    type: 'text',
                                    value: props.title,
                                    onChange: handleChange
                                })
                            );
                        };
                    }
                    return arr[index];
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
