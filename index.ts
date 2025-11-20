interface Person {
    name: string;
    age: number;
    [key:string]: any;
}

function greet(person: Person): string {
    return `Hello, ${person.name}! You are ${person.age} years old.`;
}

let user: Person = {
    name: "Alice",
    age: 30,
    occupation: "Engineer"
};

console.log(greet(user));

