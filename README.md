Found this buried in my drive, honestly I don't remember how it works, but from what I can glean from the source here's what you got:
```
select(predicate: string, object?: object): any;
```
A function that takes a predicate path string, and then applies it to an object, and gives you the result.
It looks like the most basic operation is just dot notation:
```
obj = {
	a: {
		b: {
			c: 5
		}
	}
};
select('a.b.c', obj); // => 5
```
And then you can evaluate more advanced predicates with brackets:
 - Index
`obj[5]`: Simple Index, get fifth element
`obj['key']`: Normal JS Bracket Access
 - Ranges
`obj[5:]`: Get from index 5 to the end.
`obj[:5]`: Get from the beginning to index 5.
`obj[2:5]`: Get from index 2 to index 5.
`obj[2:12:2]`: Get every second element from index 2 to index 12
 - Expressions
`obj[first == true]`: Get every element of obj with a key called `first` that has a value `true`. Similar for strings `obj[first == 'test']` and numbers `obj[first == 5]`
`obj[first != true]`: Similar to above, but not equal.
`obj[first < 5]`: Similar to above, but less than.
`obj[first <= 5]`: Similar to above, but less than or equal to.
`obj[first > 5]`: Similar to above, but greater than.
`obj[first >= 5]`: Similar to above, but greater than or equal to.
 - String Expressions
 `obj[first ^= 'abc']`: Get every element of obj with a key called `first` that has a value that starts with `'abc'`.
 `obj[first $= 'abc']`: Same as above, but ends with.
 `obj[first *= 'abc']`: Same as above, but contains.

 Predicates can also match against other predicates
 ```
 obj[first != second]
 ```

 Predicates look like they can be nested, and there are logical operators, so you can do stuff like:
 ```
 obj[first == 2 && (second != 3 || third == 'value')]
 ```

 It also looks like binary operators `+, -, *, /, %` are supported, and either operand can be a predicate on it's own.
 ```
 obj[first <= (2 + second.numberValue)]
 ```