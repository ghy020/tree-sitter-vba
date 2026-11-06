// tree-sitter-vba — Tree-sitter grammar for Visual Basic for Applications (VBA)
// Based on Microsoft VBA Language Specification (MS-VBAL)
// License: MIT
//
// This grammar is an independent implementation based on the publicly available
// Microsoft VBA language specification. It does not derive from any GPL-licensed
// ANTLR4 grammar or other third-party VBA parser implementation.

function ci(word) {
  return new RegExp(word, 'i');
}

module.exports = grammar({
  name: 'vba',

  extras: $ => [/\s/, $.comment, $._line_continuation, $._statement_separator],

  conflicts: $ => [
    [$.function_call, $.primary_expression],
    [$.dim_statement],
    [$._arg_expression_list, $.primary_expression],
    [$.block, $._simple_statement],
    [$.member_expression, $.leading_member_expression],
    [$.array_bounds, $._arg_expression_list],
  ],

  rules: {
    source_file: $ => repeat($._module_scope),

    comment: $ => token(seq("'", /[^\n]*/)),
    _line_continuation: $ => /_[ \t]*\r?\n/,
    _statement_separator: $ => ':',

    _module_scope: $ => choice(
      $.attribute_statement,
      $.option_statement, $.declare_statement,
      $.sub_statement, $.function_statement,
      $.property_statement, $.type_statement, $.enum_statement,
      $.const_statement, $.dim_statement,
    ),

    attribute_statement: $ => seq(
      ci('Attribute'), $.identifier, '=',
      choice($.string_literal, $.number_literal, $.boolean_literal),
    ),

    option_statement: $ => seq(
      ci('Option'),
      choice(
        ci('Explicit'),
        seq(ci('Compare'), choice(ci('Binary'), ci('Text'), ci('Database'))),
        seq(ci('Base'), choice('0', '1')),
        seq(ci('Private'), ci('Module')),
      ),
    ),

    declare_statement: $ => seq(
      optional(choice(ci('Public'), ci('Private'))),
      ci('Declare'), choice(ci('Sub'), ci('Function')),
      $.identifier, optional($._arg_list),
      ci('Lib'), $.string_literal,
      optional(seq(ci('Alias'), $.string_literal)),
    ),

    sub_statement: $ => seq(
      optional(choice(ci('Public'), ci('Private'), ci('Friend'), ci('Static'))),
      ci('Sub'), $.identifier, $._arg_list,
      optional($.block), ci('End'), ci('Sub'),
    ),

    function_statement: $ => seq(
      optional(choice(ci('Public'), ci('Private'), ci('Friend'), ci('Static'))),
      ci('Function'), $.identifier, $._arg_list,
      optional(seq(ci('As'), $.type)),
      optional($.block), ci('End'), ci('Function'),
    ),

    property_statement: $ => seq(
      optional(choice(ci('Public'), ci('Private'), ci('Static'))),
      ci('Property'), choice(ci('Get'), ci('Let'), ci('Set')),
      $.identifier, $._arg_list,
      optional(seq(ci('As'), $.type)),
      optional($.block), ci('End'), ci('Property'),
    ),

    type_statement: $ => seq(
      optional(choice(ci('Public'), ci('Private'))),
      ci('Type'), $.identifier,
      repeat(seq($.identifier, optional(seq(ci('As'), $.type)))),
      ci('End'), ci('Type'),
    ),

    enum_statement: $ => seq(
      optional(choice(ci('Public'), ci('Private'))),
      ci('Enum'), $.identifier,
      repeat(seq($.identifier, optional(seq('=', $.expression)))),
      ci('End'), ci('Enum'),
    ),

    _arg_list: $ => seq('(', optional(seq($._arg, repeat(seq(',', $._arg)))), ')'),

    _arg: $ => seq(
      optional(ci('Optional')),
      optional(choice(ci('ByVal'), ci('ByRef'))),
      optional(ci('ParamArray')),
      $.identifier,
      optional($._array_dim),
      optional(seq(ci('As'), $.type)),
      optional(seq('=', $.expression)),
    ),

    type: $ => $.identifier,

    block: $ => repeat1(choice(
      $.if_statement, $.single_line_if_statement,
      $.for_statement, $.for_each_statement,
      $.while_statement, $.do_statement, $.with_statement,
      $.select_case_statement, $.on_error_statement, $.resume_statement,
      $.erase_statement, $.redim_statement,
      $.set_statement, $.let_statement, $.call_statement, $.raise_statement,
      $.implicit_call_statement,
      $.exit_statement, $.goto_statement,
      $.dim_statement, $.const_statement,
      $.error_statement, $.mid_statement,
      $.expression,
    )),

    _statement: $ => choice(
      $.if_statement, $.single_line_if_statement,
      $.for_statement, $.for_each_statement,
      $.while_statement, $.do_statement, $.with_statement,
      $.select_case_statement, $.on_error_statement, $.resume_statement,
      $.erase_statement, $.redim_statement,
      $.set_statement, $.let_statement, $.call_statement, $.raise_statement,
      $.implicit_call_statement,
      $.exit_statement, $.goto_statement,
      $.dim_statement, $.const_statement,
      $.error_statement, $.mid_statement,
      $.expression,
    ),

    error_statement: $ => seq(ci('Error'), $.expression),

    mid_statement: $ => seq(
      ci('Mid'), '(', $.identifier, ',', $.expression, ',', $.expression, ')', '=', $.expression,
    ),

    if_statement: $ => prec(1, seq(
      ci('If'), $.expression, ci('Then'),
      $.block,
      repeat($.elseif_clause),
      optional($.else_clause),
      ci('End'), ci('If'),
    )),
    single_line_if_statement: $ => prec.right(2, seq(
      ci('If'), $.expression, ci('Then'),
      $._simple_statement,
      optional(seq(ci('Else'), $._simple_statement)),
    )),
    _simple_statement: $ => choice(
      $.set_statement, $.let_statement, $.call_statement,
      $.implicit_call_statement, $.raise_statement,
      $.exit_statement, $.goto_statement,
      $.resume_statement, $.error_statement, $.expression,
    ),
    elseif_clause: $ => seq(ci('ElseIf'), $.expression, ci('Then'), $.block),
    else_clause: $ => seq(ci('Else'), $.block),

    for_statement: $ => prec.right(seq(
      ci('For'), $.identifier, '=', $.expression, ci('To'), $.expression,
      optional(seq(ci('Step'), $.expression)),
      optional($.block), ci('Next'), optional($.identifier),
    )),

    for_each_statement: $ => prec.right(seq(
      ci('For'), ci('Each'), $.identifier, ci('In'), $.expression,
      optional($.block), ci('Next'), optional($.identifier),
    )),

    while_statement: $ => seq(ci('While'), $.expression, optional($.block), ci('Wend')),
    do_statement: $ => choice(
      seq(ci('Do'), choice(ci('While'), ci('Until')), $.expression, optional($.block), ci('Loop')),
      seq(ci('Do'), optional($.block), ci('Loop'), choice(ci('While'), ci('Until')), $.expression),
    ),
    with_statement: $ => seq(ci('With'), $.expression, optional($.block), ci('End'), ci('With')),

    select_case_statement: $ => seq(
      ci('Select'), ci('Case'), $.expression,
      repeat($.case_clause), optional(seq(ci('Case'), ci('Else'), $.block)),
      ci('End'), ci('Select'),
    ),
    case_clause: $ => seq(
      ci('Case'),
      choice($.expression, seq(ci('Is'), $.expression)),
      repeat(seq(',', choice($.expression, seq(ci('Is'), $.expression)))),
      optional($.block),
    ),

    on_error_statement: $ => seq(
      ci('On'), ci('Error'),
      choice(
        seq(ci('GoTo'), $.expression),
        seq(ci('Resume'), ci('Next')),
        seq(ci('GoTo'), '0'),
      ),
    ),
    resume_statement: $ => seq(ci('Resume'), choice(ci('Next'), $.expression)),
    erase_statement: $ => seq(ci('Erase'), $.expression, repeat(seq(',', $.expression))),
    redim_statement: $ => seq(
      ci('ReDim'), optional(ci('Preserve')),
      $.redim_variable,
      repeat(seq(',', $.redim_variable)),
    ),
    redim_variable: $ => seq(
      choice($.identifier, $.member_expression),
      '(', $.array_bounds, repeat(seq(',', $.array_bounds)), ')',
    ),
    array_bounds: $ => seq(
      optional(seq($.expression, ci('To'))),
      $.expression,
    ),
    let_statement: $ => seq(optional(ci('Let')), $.expression, '=', $.expression),
    set_statement: $ => seq(ci('Set'), $.expression, '=', $.expression),
    call_statement: $ => seq(ci('Call'), $.expression),
    raise_statement: $ => seq(
      ci('Err'), '.', ci('Raise'),
      choice($.implicit_call_argument_tail, $.expression),
    ),
    implicit_call_statement: $ => choice(
      seq(
        $.identifier,
        $.implicit_call_argument_tail,
      ),
      prec.right(6, seq(
        choice($.identifier, $.member_expression),
        $.expression,
      )),
    ),
    implicit_call_argument_tail: $ => token(prec(1, seq(
      /[ \t]+/,
      /(?:_[ \t]*\r?\n|[^\r\n,])+/,
      repeat1(seq(',', /(?:_[ \t]*\r?\n|[^\r\n,])*/)),
    ))),
    exit_statement: $ => seq(ci('Exit'), choice(ci('Sub'), ci('Function'), ci('Property'), ci('Do'), ci('For'), ci('While'))),
    goto_statement: $ => seq(ci('GoTo'), $.expression),

    dim_statement: $ => seq(
      choice(ci('Dim'), ci('Public'), ci('Private'), ci('Static')),
      $.identifier,
      optional($._array_dim),
      optional(seq(ci('As'), $.type)),
      optional(seq('=', $.expression)),
      repeat(seq(',', $.identifier, optional($._array_dim), optional(seq(ci('As'), $.type)))),
    ),

    _array_dim: $ => seq('(', optional(seq($.expression, repeat(seq(',', $.expression)))), ')'),

    const_statement: $ => seq(
      optional(choice(ci('Public'), ci('Private'))),
      ci('Const'), $.identifier, optional(seq(ci('As'), $.type)), '=', $.expression,
    ),

    // === Expressions ===
    expression: $ => choice(
      $.unary_expression,
      $.binary_expression,
      $.call_expression,
      $.member_expression,
      $.leading_member_expression,
      $.named_argument_expression,
      $.function_call,
      $.primary_expression,
    ),

    call_expression: $ => prec.left(5, seq(
      choice($.member_expression, $.leading_member_expression, $.function_call),
      '(', optional($._arg_expression_list), ')',
    )),

    member_expression: $ => prec.left(10, seq(
      choice($.primary_expression, $.function_call, $.call_expression, $.member_expression),
      '.', $.identifier,
    )),

    leading_member_expression: $ => prec.left(10, seq(
      '.', $.identifier,
      repeat(seq('.', $.identifier)),
    )),

    named_argument_expression: $ => prec.right(6, seq(
      $.identifier, ':=', $.expression,
    )),

    assignment_expression: $ => prec.right(-1, seq($.expression, '=', $.expression)),

    binary_expression: $ => choice(
      prec.left(1, seq($.expression, choice('+', '-', '*', '/', '\\', ci('Mod'), '^'), $.expression)),
      prec.left(2, seq($.expression, '&', $.expression)),
      prec.left(3, seq($.expression, choice('=', '<>', '<', '>', '<=', '>='), $.expression)),
      prec.left(3, seq($.expression, ci('Is'), optional(ci('Not')), $.expression)),
      prec.left(4, seq($.expression, choice(ci('And'), ci('Or'), ci('Xor'), ci('Eqv'), ci('Imp')), $.expression)),
    ),

    unary_expression: $ => prec.left(5, seq(choice(ci('Not'), '-'), $.expression)),

    function_call: $ => seq($.identifier, '(', optional($._arg_expression_list), ')'),
    _arg_expression_list: $ => choice(
      seq($.expression, repeat(seq(',', optional($.expression)))),
      seq(',', optional($.expression), repeat(seq(',', optional($.expression)))),
    ),

    primary_expression: $ => choice(
      $.identifier, $.number_literal, $.string_literal,
      $.boolean_literal, $.nothing_literal, $.null_literal, $.empty_literal,
      seq('(', $.expression, ')'),
    ),

    number_literal: $ => token(choice(
      /&H[0-9a-fA-F]+/, /&O[0-7]+/,
      /\d+\.\d*([eE][+-]?\d+)?/, /\d+[eE][+-]?\d+/, /\d+/,
    )),

    string_literal: $ => token(seq('"', repeat(choice(/[^"]/, '""')), '"')),
    boolean_literal: $ => choice(ci('True'), ci('False')),
    nothing_literal: $ => ci('Nothing'),
    null_literal: $ => ci('Null'),
    empty_literal: $ => ci('Empty'),

    identifier: $ => /[a-zA-Z_][a-zA-Z0-9_]*[$%&@!#]?/,
  },
});
