'use strict';

const validateReSchemaErrors = require('./lib/gen-errors')
    , validateArray = require('./lib/validate-array')
    , getDefaults = require('./lib/get-defaults')
    ;

const reSchemaErrors = validateReSchemaErrors(validateArray);

module.exports = React => {
    const $ = React.createElement;
    const schemaErrors = reSchemaErrors(React);
    return genForm => {

        function genItemizer (config) {
            const schema = config.schema
                , path = config.path
                , updateState = config.updateState;

            let arr = [];

            return {
                get: function (index) {
                    if (arr[index] === undefined) {
                        const selfPath = path.concat([index]);

                        let handleDelete;
                        if (typeof updateState === 'function') {
                            const selfBody = { $splice: [[index, 1]] };
                            const selfSpec = {
                                data: path.reduceRight((prev, key) => ({ [key]: prev }), selfBody)
                            };

                            handleDelete = function () {
                                updateState(selfSpec);
                            };
                        }

                        const Form = genForm({
                            schema: schema.items,
                            path: selfPath,
                            updateState: updateState
                        });

                        arr[index] = function Ari (props) {

                            return $('span', {},
                                $('button', {
                                    type: 'button',
                                    onClick: handleDelete
                                }, '-'),
                                $(Form, props)
                            );
                        };
                    }
                    return arr[index];
                }
            };
        }

        return config => {
            const itemizer = genItemizer(config);
            const schema = config.schema
                , path = config.path
                , updateState = config.updateState;
            const Errors = schemaErrors(schema);

            let handleAdd;
            if (typeof updateState === 'function') {
                const arrayBody = { $push: [getDefaults(schema.items)] };
                const arraySpec = {
                    data: path.reduceRight((prev, key) => ({ [key]: prev }), arrayBody)
                };
                handleAdd = function  () {
                    updateState(arraySpec);
                };
            }

            return class Arr extends React.Component {

                constructor (props) {
                    super(props);
                }

                shouldComponentUpdate (nextProps) {
                    if (this.props.data === nextProps.data) {
                        return false;
                    }
                    return true;
                }

                render () {
                    const data = this.props.data || [];
                    return (
                        $('li', {},
                            $('button', {
                                type: 'button',
                                onClick: handleAdd
                            }, '+'),
                            schema.title,
                            $('ol', { start: 0 },
                                data.map((e, i) => $(itemizer.get(i), {
                                    key: i,
                                    data: e
                                }))
                            ),
                            $(Errors, this.props)
                        )
                    );
                }
            };
        };
    };
};