# @fern/woo

A lightweight, type-safe utility for handling WooCommerce actions with the Fern Framework.


## Installation

```bash
bun add @fern/woo @fern/core
# or
npm install @fern/woo @fern/core
# or
yarn add @fern/woo @fern/core
```

## Basic Usage

To use this library, you first need to setup a Controller in your Fern project.

Let's create a simple controller with a single action:

```php
// App/Controllers/HomePageController.php
<?php

namespace App\Controllers;

use Fern\Core\Factory\Singleton;
use Fern\Core\Services\HTTP\Reply;
use Fern\Core\Services\Controller\Controller;
use Fern\Core\Services\HTTP\Request;


class HomePageController extends Singleton implements Controller {
  // Id of your HomePage
  public static string $handle = '4';

  /**
   * Handle the request and return a reply.
   *
   * @param Request $request
   * @return Reply
   */
  public function handle(Request $request): Reply {
    return new Reply(200, Views::render('HomePage', [
      'title' => 'Hello Fern!',
      'content' => 'Welcome to the Fern Framework!',
    ]));
  }

  /**
   * An exemple of an action that say Hello World.
   *
   * @see https://fern.dev/actions
   *
   * @return Reply
   */
  public function sayHelloWorld(Request $request): Reply {
    $action = $request->getAction();
    $greeting = $action->get('greeting');

    return new Reply(200, [
      'msg' => "Hello, {$greeting}!",
    ]);
  }
}
```

```ts
import { callAction } from '@fern/core';

const sayHelloWorld = async () => {
  const { data, error, status } = await callAction('sayHelloWorld', { greeting: 'World' });

  if (status === 'error') {
    console.error('Failed to fetch user:', error?.message);
    return;
  }

  console.log('Fern is saying: ', data?.msg);
};
```

## Securing actions

Fern actions can be secured using several attributes, one of those is `#[Nonce]` that will automatically check for a valid nonce in the request:

```php
// App/Controllers/Auth/MyAccountController.php
<?php

namespace App\Controllers\Auth;

use Fern\Core\Factory\Singleton;
use Fern\Core\Services\HTTP\Reply;
use Fern\Core\Services\Controller\Controller;
use Fern\Core\Services\HTTP\Request;

class MyAccountController extends Singleton implements Controller {
  public static string $handle = '5';

  public function handle(Request $request): Reply {
    return new Reply(200, Views::render('UserProfile', [
      'title' => 'User Profile',
      'user' => get_current_user(),
      'nonce' => wp_create_nonce('update_profile'),
    ]));
  }

  /**
   * Update user profile with secure nonce verification
   *
   * @see https://fern.dev/security/nonce
   *
   * @return Reply
   */
  #[Nonce(actionName: 'update_profile')]
  public function updateProfile(Request $request): Reply {
    // Nonce verification is automatically handled by the framework
    $action = $request->getAction();

    // Get data from request
    $newData = $action->get('profileData');
    $id      = $action->get('id');

    try {
      // Update user profile
      wp_update_user($id, $newData);

      return new Reply(200, [
        'success' => true,
        'message' => 'Profile updated successfully',
      ]);
    } catch (\Exception $e) {
      return new Reply(400, [
        'success' => false,
        'message' => 'Failed to update profile',
      ]);
    }
  }
}
```

And, in the client side you can call the action like this:

```ts
const updateProfile = async (id: string, newData: any, nonce: string) => {
  const { data, error, status } = await callAction('updateProfile', { nonce, id, newData });
};

updateProfile('1', { name: 'John Doe' }, 'whateveryournonceis');
```
